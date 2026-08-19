const STORAGE_KEY = "kwdx_meta_v1";

function defaultState() {
  return { currency: 0, totalRuns: 0, bestStage: 1, unlocks: [] };
}

export function loadMeta() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed, unlocks: Array.isArray(parsed.unlocks) ? parsed.unlocks : [] };
  } catch (error) {
    console.error("Failed to load meta progress.", error);
    return defaultState();
  }
}

export function saveMeta(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save meta progress.", error);
  }
}

export function earnForRun(state, { stageReached, kills }) {
  const earned = Math.max(1, stageReached * 8 + Math.floor((kills || 0) / 2));
  state.currency += earned;
  state.totalRuns += 1;
  state.bestStage = Math.max(state.bestStage, stageReached);
  return earned;
}

export const SHOP_ITEMS = [
  {
    id: "extra_soldier_start",
    name: "予備兵士配属",
    cost: 40,
    desc: "次ラン以降、兵士1人を追加した状態で開始します。",
  },
  {
    id: "hero_hp_up",
    name: "王の体力強化",
    cost: 60,
    desc: "王の最大HPが恒久的に+2されます。",
  },
  {
    id: "mage_mana_up",
    name: "魔力の泉",
    cost: 50,
    desc: "大魔法使いの最大MPが恒久的に+2されます。",
  },
];

export function ownsUpgrade(state, id) {
  return state.unlocks.includes(id);
}

export function purchaseUpgrade(state, id) {
  const item = SHOP_ITEMS.find((entry) => entry.id === id);
  if (!item || ownsUpgrade(state, id) || state.currency < item.cost) return false;
  state.currency -= item.cost;
  state.unlocks.push(id);
  return true;
}
