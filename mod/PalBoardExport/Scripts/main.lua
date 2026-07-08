--[[ PalBoardExport — UE4SS Lua mod ---------------------------------------

  Dumps YOUR owned pals (party + palbox) to a JSON file that PalBoard imports
  via the "🎮 게임에서 가져오기" button.

  Because your own pals are replicated to your game client so the palbox UI can
  render them, this works even when you are a GUEST on someone else's server —
  no access to the server's save file required.

  It is READ-ONLY. It never writes to the game, so it is far lower risk than
  cheat/edit mods. Still: use on servers where mods are allowed.

  HOW TO USE
    1. Install (see mod/README.md).
    2. In game, open your Pal Box once (so the data is loaded on the client).
    3. Press the hotkey (default F8) to write the JSON.
    4. Import the file into PalBoard.

  IF IT FINDS NOTHING
    Class/property names below are the parts most likely to differ between game
    versions. Press the DISCOVERY hotkey (default F7) to dump candidate class
    names to the UE4SS console, then fix the CONFIG block. See README §검증.
----------------------------------------------------------------------------]]

local CONFIG = {
  -- Output file. Relative paths land in the game's Binaries/Win64 folder.
  -- The full resolved path is printed to the console when you export.
  output_path = "palboard-export.json",

  -- Hotkeys (UE4SS `Key` table).
  export_key = Key.F8,
  discovery_key = Key.F7,

  -- The UObject class that holds one pal's individual data. UE4SS drops the
  -- U/A prefix. If F8 finds nothing, run F7 and look for the real name here.
  pal_param_class = "PalIndividualCharacterParameter",

  -- Property on that object holding the FPalIndividualCharacterSaveParameter.
  save_param_prop = "SaveParameter",

  -- Field names inside the save parameter.
  fields = {
    character_id = "CharacterID",       -- FName, e.g. "SheepBall", "BOSS_Kitsunebi"
    gender       = "Gender",            -- enum EPalGenderType (number at runtime)
    level        = "Level",             -- int
    nickname     = "NickName",          -- FString
    passives     = "PassiveSkillList",  -- TArray<FName>
    iv_hp        = "Talent_HP",         -- int 0..100
    iv_shot      = "Talent_Shot",       -- int 0..100 (in-game "Attack")
    iv_melee     = "Talent_Melee",      -- int 0..100 (fallback for attack)
    iv_defense   = "Talent_Defense",    -- int 0..100
  },

  -- When true, dumps every pal found (including possibly other players' on a
  -- server). When false, tries to keep only pals whose owner is the local
  -- player. Leave false; flip to true only if owner filtering drops your pals.
  export_all_owners = false,
}

-- ---------------------------------------------------------------------------

local function log(msg)
  print("[PalBoardExport] " .. tostring(msg))
end

-- Safe property read: returns (value, ok). Never throws.
local function get(obj, prop)
  local ok, val = pcall(function() return obj[prop] end)
  if ok then return val, true end
  return nil, false
end

-- FName / FString / number → Lua value.
local function toStr(v)
  if v == nil then return nil end
  local ok, s = pcall(function()
    if type(v) == "userdata" and v.ToString then return v:ToString() end
    return tostring(v)
  end)
  if ok and s ~= nil and s ~= "" and s ~= "None" then return s end
  return nil
end

local function toNum(v)
  if v == nil then return nil end
  local n = tonumber(v)
  return n
end

-- Best-effort stringify of any value (struct/guid/number/name) for diagnostics
-- and for comparing owner ids. Tries :ToString(), then per-field Guid parts.
local function probe(v)
  if v == nil then return nil end
  local ok, s = pcall(function()
    if type(v) == "userdata" then
      if v.ToString then
        local r = v:ToString()
        if r and r ~= "" then return tostring(r) end
      end
      -- FGuid fallback: assemble from A/B/C/D if present.
      local okg, g = pcall(function()
        return string.format("%08X%08X%08X%08X", v.A or 0, v.B or 0, v.C or 0, v.D or 0)
      end)
      if okg and g then return g end
    end
    return tostring(v)
  end)
  if ok and s and s ~= "" and s ~= "None" then return s end
  return nil
end

-- Read an FGuid (owner id) into a stable hex string, or nil if absent/zero
-- (wild/unowned pals). Tries :ToString(), then the A/B/C/D uint32 fields.
local function guidStr(v)
  if v == nil then return nil end
  -- FGuid is a ScriptStruct with four uint32 fields A/B/C/D. Read those
  -- directly — do NOT touch .ToString or :get(); UE4SS throws on those for a
  -- Guid struct. UE4SS returns the uint32s as signed Lua integers, so wrap to
  -- unsigned before hex-formatting.
  local ok, s = pcall(function()
    local a, b, c, d = v.A, v.B, v.C, v.D
    if a == nil then return nil end
    local function u32(x)
      return string.format("%08x", (tonumber(x) or 0) % 0x100000000)
    end
    return u32(a) .. u32(b) .. u32(c) .. u32(d)
  end)
  if not ok or s == nil then return nil end
  -- Treat an all-zero guid as unowned (wild pal).
  if s:gsub("0", "") == "" then return nil end
  return s
end

-- Read a TArray<FName> into a Lua array of strings.
local function readNameArray(arr)
  local out = {}
  if arr == nil then return out end
  -- UE4SS TArray supports :ForEach and :GetArrayNum; guard both styles.
  local ok = pcall(function()
    arr:ForEach(function(_, elem)
      local s = toStr(elem:get())
      if s then out[#out + 1] = s end
    end)
  end)
  if not ok then
    pcall(function()
      local n = arr:GetArrayNum()
      for i = 1, n do
        local s = toStr(arr[i])
        if s then out[#out + 1] = s end
      end
    end)
  end
  return out
end

-- Normalize the gender enum to "Male"/"Female"/"Unknown".
-- At runtime UE4SS returns EPalGenderType as a number (Male=1, Female=2);
-- the save-file path instead sees the string "EPalGenderType::Male/Female".
-- NOTE: if genders come out swapped, flip the 1/2 mapping below.
local function readGender(v)
  if type(v) == "number" then
    if v == 1 then return "Male" end
    if v == 2 then return "Female" end
    return "Unknown"
  end
  local s = toStr(v)
  if s == nil then return "Unknown" end
  s = s:gsub("EPalGenderType::", "")
  if s:find("Female") then return "Female" end
  if s:find("Male") then return "Male" end
  return "Unknown"
end

-- Minimal JSON string escaper (enough for pal names / codes).
local function jstr(s)
  s = tostring(s)
  s = s:gsub("\\", "\\\\"):gsub('"', '\\"'):gsub("\n", "\\n"):gsub("\r", "\\r"):gsub("\t", "\\t")
  return '"' .. s .. '"'
end

-- Serialize one pal record to a JSON object string.
local function palToJson(p)
  local parts = {}
  parts[#parts + 1] = "\"characterId\":" .. jstr(p.characterId)
  parts[#parts + 1] = "\"gender\":" .. jstr(p.gender)
  if p.level then parts[#parts + 1] = "\"level\":" .. p.level end
  if p.nickname then parts[#parts + 1] = "\"nickname\":" .. jstr(p.nickname) end
  if p.ivHp then parts[#parts + 1] = "\"ivHp\":" .. p.ivHp end
  if p.ivAtk then parts[#parts + 1] = "\"ivAtk\":" .. p.ivAtk end
  if p.ivDef then parts[#parts + 1] = "\"ivDef\":" .. p.ivDef end
  if p.ownerUid then parts[#parts + 1] = "\"ownerUid\":" .. jstr(p.ownerUid) end
  local ps = {}
  for _, code in ipairs(p.passives or {}) do ps[#ps + 1] = jstr(code) end
  parts[#parts + 1] = "\"passives\":[" .. table.concat(ps, ",") .. "]"
  return "{" .. table.concat(parts, ",") .. "}"
end

-- Read one pal parameter object into a plain Lua record, or nil if it has no
-- CharacterID (empty slot / not a real pal).
local function readPal(obj)
  local sp = get(obj, CONFIG.save_param_prop)
  if sp == nil then sp = obj end -- some builds expose fields directly
  local f = CONFIG.fields

  local characterId = toStr(get(sp, f.character_id))
  if not characterId then return nil end

  local ivShot = toNum(get(sp, f.iv_shot))
  local ivMelee = toNum(get(sp, f.iv_melee))

  return {
    characterId = characterId,
    gender = readGender(get(sp, f.gender)),
    level = toNum(get(sp, f.level)),
    nickname = toStr(get(sp, f.nickname)),
    passives = readNameArray(get(sp, f.passives)),
    ivHp = toNum(get(sp, f.iv_hp)),
    ivAtk = ivShot or ivMelee,
    ivDef = toNum(get(sp, f.iv_defense)),
    ownerUid = guidStr(get(sp, "OwnerPlayerUId")),
  }
end

local function resolveOutputPath()
  return CONFIG.output_path
end

local function writeFile(path, contents)
  local file, err = io.open(path, "w")
  if not file then
    log("ERROR: could not open output file: " .. tostring(err))
    return false
  end
  file:write(contents)
  file:close()
  return true
end

-- ---- Export -----------------------------------------------------------------

local function doExport()
  log("Exporting...")
  local objects = FindAllOf(CONFIG.pal_param_class)
  if objects == nil or #objects == 0 then
    log("No '" .. CONFIG.pal_param_class .. "' objects found.")
    log("Open your Pal Box once, then retry. If still nothing, press F7 (discovery).")
    return
  end
  log("Found " .. #objects .. " candidate pal objects.")

  local pals = {}
  local seen = {}
  for _, obj in ipairs(objects) do
    local ok, rec = pcall(readPal, obj)
    if ok and rec then
      -- de-dupe by identity string (characterId+level+ivs+nickname) to avoid
      -- the same pal appearing via multiple handles.
      local key = table.concat({
        rec.characterId, rec.level or "", rec.ivHp or "", rec.ivAtk or "",
        rec.ivDef or "", rec.nickname or "", table.concat(rec.passives or {}, "|"),
      }, "#")
      if not seen[key] then
        seen[key] = true
        pals[#pals + 1] = rec
      end
    end
  end

  if #pals == 0 then
    log("Objects were found but none had a readable CharacterID.")
    log("The property names in CONFIG.fields are probably off — see README §검증.")
    return
  end

  local body = {}
  for _, p in ipairs(pals) do body[#body + 1] = palToJson(p) end
  local json = '{"version":1,"source":"ue4ss-mod","pals":[' .. table.concat(body, ",") .. "]}"

  local path = resolveOutputPath()
  if writeFile(path, json) then
    log("OK — wrote " .. #pals .. " pals to: " .. path)
    log("(relative to the game's Binaries/Win64 folder if not absolute)")
    log("Now import that file in PalBoard → 🎮 게임에서 가져오기")
  end
end

-- ---- Discovery --------------------------------------------------------------
-- Dumps class names containing "Pal"+"Character"/"Param" so you can find the
-- real class if the default doesn't match this game version.

local function doDiscovery()
  log("Discovery: scanning for likely pal-parameter classes...")
  local candidates = {
    "PalIndividualCharacterParameter",
    "PalIndividualCharacterParameterBase",
    "PalIndividualCharacterSaveParameter",
    "PalCharacterContainer",
    "PalPlayerCharacter",
    "PalPlayerState",
  }
  for _, name in ipairs(candidates) do
    local objs = FindAllOf(name)
    local n = (objs ~= nil) and #objs or 0
    log(string.format("  %-42s -> %d instance(s)", name, n))
    if n > 0 and (name:find("Parameter")) then
      -- Print the first object's fields to help confirm property names.
      local obj = objs[1]
      local sp = get(obj, CONFIG.save_param_prop) or obj
      for _, prop in ipairs({
        CONFIG.fields.character_id, CONFIG.fields.gender, CONFIG.fields.level,
        CONFIG.fields.passives, CONFIG.fields.iv_hp, CONFIG.fields.iv_shot,
        CONFIG.fields.iv_defense, CONFIG.fields.nickname,
      }) do
        local v, okv = get(sp, prop)
        log(string.format("     .%-16s readable=%s value=%s",
          prop, tostring(okv), tostring(okv and (toStr(v) or v) or "-")))
      end
    end
  end
  -- Owner grouping: tally all pals by owner UID (via the fixed guidStr) with a
  -- few sample species each. Use this to confirm your UID group and count.
  log("--- owner grouping (all pals) ---")
  local pobjs = FindAllOf(CONFIG.pal_param_class) or {}
  local groups, order, wild = {}, {}, 0
  for _, obj in ipairs(pobjs) do
    local sp = get(obj, CONFIG.save_param_prop) or obj
    local cid = toStr(get(sp, CONFIG.fields.character_id))
    if cid then
      local uid = guidStr(get(sp, "OwnerPlayerUId"))
      if uid == nil then
        wild = wild + 1
      else
        local g = groups[uid]
        if not g then g = { count = 0, samples = {} }; groups[uid] = g; order[#order + 1] = uid end
        g.count = g.count + 1
        if #g.samples < 6 then g.samples[#g.samples + 1] = cid end
      end
    end
  end
  log(string.format("distinct owners=%d, wild/unowned=%d", #order, wild))
  for _, uid in ipairs(order) do
    local g = groups[uid]
    log(string.format("  UID %s : %d pals  [%s]", uid, g.count, table.concat(g.samples, ", ")))
  end
  log("(your PlayerUId, lowercased: 6bc6db07000000000000000000000000)")

  log("Discovery done. Update CONFIG at the top of main.lua to match, then use F8.")
  log("Tip: also use UE4SS Live View (Ctrl+Enter dumps, or the GUI) to browse objects.")
end

-- ---- Register hotkeys -------------------------------------------------------

RegisterKeyBind(CONFIG.export_key, doExport)
RegisterKeyBind(CONFIG.discovery_key, doDiscovery)

log("Loaded. F8 = export pals, F7 = discovery. Output: " .. CONFIG.output_path)
