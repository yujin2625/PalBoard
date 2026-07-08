// Minimal GVAS property reader for Palworld's CharacterSaveParameterMap.
//
// The WASM uesave step decompresses + parses the outer save but leaves this
// map as a raw byte blob (Palworld-specific struct it doesn't decode). This
// module parses that blob into owned-pal records.
//
// It implements just enough of the UE property serialization to walk the map:
// each map entry has a Key (PlayerUId/InstanceId struct) and a Value whose
// `RawData` byte array is itself a GVAS property list — the pal's SaveParameter
// (CharacterID, Gender, Level, PassiveSkillList, Talent_*, IsPlayer, NickName).
//
// Robustness trick: every property records where its `size`-counted payload
// starts and the reader hard-resyncs to `payloadStart + size` afterwards, so an
// unrecognized nested type is skipped cleanly instead of desyncing the stream.

class Reader {
  constructor(buf) {
    this.buf = buf;
    this.off = 0;
  }
  eof() {
    return this.off >= this.buf.length;
  }
  skip(n) {
    this.off += n;
  }
  read(n) {
    const b = this.buf.subarray(this.off, this.off + n);
    this.off += n;
    return b;
  }
  u8() {
    return this.buf.readUInt8(this.off++);
  }
  int32() {
    const v = this.buf.readInt32LE(this.off);
    this.off += 4;
    return v;
  }
  uint32() {
    const v = this.buf.readUInt32LE(this.off);
    this.off += 4;
    return v;
  }
  int64() {
    const v = this.buf.readBigInt64LE(this.off);
    this.off += 8;
    return Number(v);
  }
  float() {
    const v = this.buf.readFloatLE(this.off);
    this.off += 4;
    return v;
  }
  double() {
    const v = this.buf.readDoubleLE(this.off);
    this.off += 8;
    return v;
  }
  fstring() {
    const len = this.int32();
    if (len === 0) return "";
    if (len < 0) {
      const bytes = -len * 2;
      const s = this.buf.toString("utf16le", this.off, this.off + bytes - 2);
      this.off += bytes;
      return s;
    }
    const s = this.buf.toString("latin1", this.off, this.off + len - 1);
    this.off += len;
    return s;
  }
}

const SPECIAL_STRUCT_BYTES = {
  Guid: 16,
  DateTime: 8,
  Timespan: 8,
  Vector: 24, // 3 × double (Palworld uses LWC doubles)
  Rotator: 24,
  Quat: 32,
  LinearColor: 16,
};

function readStruct(r, structType, size, payloadStart) {
  const fixed = SPECIAL_STRUCT_BYTES[structType];
  if (fixed !== undefined) {
    if (structType === "Guid") {
      const b = r.read(16);
      return b.toString("hex");
    }
    return r.read(fixed);
  }
  // Generic property-list struct.
  try {
    return readProperties(r);
  } catch {
    // Fall back to skipping via the outer size resync.
    r.off = payloadStart + size;
    return null;
  }
}

function readArray(r, arrType, size, payloadStart) {
  const count = r.int32();
  if (arrType === "ByteProperty") {
    // Raw bytes (this is how RawData is stored).
    const remaining = payloadStart + size - r.off;
    return r.read(Math.max(0, remaining));
  }
  if (arrType === "NameProperty" || arrType === "EnumProperty" || arrType === "StrProperty") {
    const out = [];
    for (let i = 0; i < count; i++) out.push(r.fstring());
    return out;
  }
  // Arrays of struct etc. — not needed for pal extraction; skip via resync.
  return { _skippedArrayOf: arrType, count };
}

function readValue(r, type, size) {
  switch (type) {
    case "StructProperty": {
      const structType = r.fstring();
      r.skip(16); // struct guid
      r.u8(); // guid-present pad
      const start = r.off;
      const v = readStruct(r, structType, size, start);
      r.off = start + size;
      return v;
    }
    case "ArrayProperty": {
      const arrType = r.fstring();
      r.u8();
      const start = r.off;
      const v = readArray(r, arrType, size, start);
      r.off = start + size;
      return v;
    }
    case "BoolProperty": {
      const v = r.u8() !== 0;
      r.u8();
      return v;
    }
    case "EnumProperty": {
      r.fstring(); // enum type
      r.u8();
      const start = r.off;
      const v = r.fstring();
      r.off = start + size;
      return v;
    }
    case "ByteProperty": {
      r.fstring(); // enum name
      r.u8();
      const start = r.off;
      const v = size === 1 ? r.u8() : r.fstring();
      r.off = start + size;
      return v;
    }
    case "IntProperty": {
      r.u8();
      const start = r.off;
      const v = r.int32();
      r.off = start + size;
      return v;
    }
    case "Int64Property": {
      r.u8();
      const start = r.off;
      const v = r.int64();
      r.off = start + size;
      return v;
    }
    case "FloatProperty": {
      r.u8();
      const start = r.off;
      const v = r.float();
      r.off = start + size;
      return v;
    }
    case "DoubleProperty": {
      r.u8();
      const start = r.off;
      const v = r.double();
      r.off = start + size;
      return v;
    }
    case "StrProperty":
    case "NameProperty": {
      r.u8();
      const start = r.off;
      const v = r.fstring();
      r.off = start + size;
      return v;
    }
    default: {
      // Unknown scalar-ish: skip its payload.
      r.u8();
      const start = r.off;
      const v = r.read(size);
      r.off = start + size;
      return v;
    }
  }
}

function readProperties(r) {
  const props = {};
  for (let guard = 0; guard < 4096; guard++) {
    const name = r.fstring();
    if (name === "None" || name === "") break;
    const type = r.fstring();
    const size = r.int64();
    props[name] = readValue(r, type, size);
  }
  return props;
}

/** Parse the raw CharacterSaveParameterMap byte array into pal records.
 * `bytes` is a Uint8Array/number[] as returned by the WASM step. */
export function parseCharacterMap(bytes) {
  const r = new Reader(Buffer.from(bytes));
  r.uint32(); // NumKeysToRemove (0)
  const count = r.int32();
  const entries = [];
  for (let i = 0; i < count; i++) {
    let key, value;
    try {
      key = readProperties(r); // { PlayerUId, InstanceId, DebugName? }
      value = readProperties(r); // { RawData: <bytes> }
    } catch (e) {
      entries.push({ error: String(e), index: i });
      break;
    }
    const rawData = value?.RawData;
    if (!rawData || !(rawData instanceof Uint8Array || Buffer.isBuffer(rawData))) {
      entries.push({ key, unreadable: true });
      continue;
    }
    let pal;
    try {
      pal = readProperties(new Reader(Buffer.from(rawData)));
    } catch (e) {
      entries.push({ key, rawError: String(e) });
      continue;
    }
    entries.push({ key, pal });
  }
  return { count, entries };
}

/** Extract the SaveParameter object from a parsed RawData property tree,
 * tolerating the couple of shapes it can take. */
export function saveParamOf(palProps) {
  if (!palProps || typeof palProps !== "object") return null;
  if (palProps.SaveParameter && typeof palProps.SaveParameter === "object") {
    return palProps.SaveParameter;
  }
  // Sometimes nested one level under an object wrapper.
  for (const v of Object.values(palProps)) {
    if (v && typeof v === "object" && ("CharacterID" in v || "IsPlayer" in v)) return v;
  }
  return palProps;
}
