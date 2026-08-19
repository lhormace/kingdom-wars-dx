export function rollChoices(pool, count, excludeIds = []) {
  const available = pool.filter((choice) => !excludeIds.includes(choice.id));
  const source = available.length >= count ? available : pool;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export const FORMATION_DRAFT_POOL = [
  {
    id: "add_soldier",
    name: "援軍：兵士",
    desc: "隊列の最後尾に兵士を1人追加します。",
    apply(scene) {
      scene.formation.push({ type: "soldier" });
    },
  },
  {
    id: "add_knight",
    name: "援軍：騎士",
    desc: "隊列の最後尾に騎士を1人追加します。騎士は通常敵に2ダメージ。",
    apply(scene) {
      scene.formation.push({ type: "knight" });
    },
  },
  {
    id: "soldier_dice_up",
    name: "兵士鍛錬",
    desc: "全ての兵士の攻撃ダイスに+1（このラン中永続）。",
    apply(scene) {
      scene.formationLevel.soldierDiceBonus = (scene.formationLevel.soldierDiceBonus || 0) + 1;
    },
  },
  {
    id: "knight_dice_up",
    name: "騎士鍛錬",
    desc: "全ての騎士の攻撃ダイスに+1（このラン中永続）。",
    apply(scene) {
      scene.formationLevel.knightDiceBonus = (scene.formationLevel.knightDiceBonus || 0) + 1;
    },
  },
  {
    id: "mage_power_up",
    name: "魔力増幅",
    desc: "大魔法使いの最大MP+2、光線ダメージ+1。",
    apply(scene) {
      scene.mage.maxMana += 2;
      scene.mage.mana = Math.min(scene.mage.maxMana, scene.mage.mana + 2);
      scene.mage.beamDamageBonus = (scene.mage.beamDamageBonus || 0) + 1;
    },
  },
  {
    id: "priest_power_up",
    name: "祈祷強化",
    desc: "僧侶の最大MP+2、回復量+1。",
    apply(scene) {
      scene.priest.maxMana += 2;
      scene.priest.mana = Math.min(scene.priest.maxMana, scene.priest.mana + 2);
      scene.priest.healAmount = (scene.priest.healAmount || 2) + 1;
    },
  },
];

export const SKILL_DRAFT_POOL = [
  {
    id: "combo_master",
    name: "連撃の心得",
    desc: "3連撃ごとの攻撃ボーナスが2倍になります。",
    apply(scene) {
      scene.acquiredSkills.push("combo_master");
    },
  },
  {
    id: "roar_resist",
    name: "竜鱗の加護",
    desc: "ボスの咆哮が届く範囲を縮小します。",
    apply(scene) {
      scene.acquiredSkills.push("roar_resist");
    },
  },
  {
    id: "rescue_heal",
    name: "救出の福音",
    desc: "捕虜を救出した際のHP回復量+1。",
    apply(scene) {
      scene.acquiredSkills.push("rescue_heal");
    },
  },
  {
    id: "berserker_curse",
    name: "呪い：狂戦士",
    desc: "与ダメージ+1、ただし被弾ダメージも+1（ハイリスク・ハイリターン）。",
    apply(scene) {
      scene.acquiredSkills.push("berserker_curse");
    },
  },
  {
    id: "vanguard_focus",
    name: "先陣の加護",
    desc: "隊列の先頭が倒れても連撃数がリセットされなくなります。",
    apply(scene) {
      scene.acquiredSkills.push("vanguard_focus");
    },
  },
  {
    id: "regen_boost",
    name: "活力の巡り",
    desc: "時間経過による自然回復の間隔が短縮されます。",
    apply(scene) {
      scene.acquiredSkills.push("regen_boost");
    },
  },
];
