# Chapter 003 Full Game Draft - Knives in the Palace, Red Hare at the Gate

- Source chapter: `003-第三回-議溫明董卓叱丁原，餽金珠李肅說呂布.md`
- Source title: 議溫明董卓叱丁原，餽金珠李肅說呂布
- Game chapter: Chapter 3
- Working EN title: Knives in the Palace, Red Hare at the Gate
- Working ZH title: 宮門刀火，赤兔入營

## Source Spine

Chapter 3 begins with Cao Cao warning He Jin that summoning outside armies will expose the anti-eunuch plot and ruin everything. He Jin dismisses him and secretly calls provincial forces, including Dong Zhuo. Dong Zhuo marches toward Luoyang under cover of a memorial calling for the eunuchs' destruction. Zheng Tai and Lu Zhi warn that bringing Dong Zhuo into court will invite disaster, then abandon office when He Jin refuses to listen.

The Ten Attendants panic, manipulate Empress He, and lure He Jin into the palace. Chen Lin, Yuan Shao, and Cao Cao warn him not to go or at least to summon the eunuchs out first. He Jin enters anyway and is killed behind closed gates. Yuan Shao receives He Jin's severed head, calls for vengeance, and the palace purge begins. Yuan Shu's troops break in, eunuchs are slaughtered indiscriminately, the palace burns, Lu Zhi rescues Empress He, Wu Kuang kills He Miao, and Cao Cao tries to restore order while troops search for the emperor.

Zhang Rang and Duan Gui flee with the young emperor and the Prince of Chenliu. Zhang Rang drowns himself under pursuit, the two boys hide by the river, follow fireflies through the night, and are found by Cui Yi. Min Gong kills Duan Gui, discovers the emperor, and helps return him. On the road, Dong Zhuo arrives with troops. The emperor is terrified, but the Prince of Chenliu sharply challenges Dong Zhuo, impressing him and planting the idea of replacing the emperor.

Back in Luoyang, Dong Zhuo gathers He Jin's soldiers, enters the palace freely, and prepares to depose the emperor. Bao Xin urges Yuan Shao and Wang Yun to strike early, but they hesitate, so Bao Xin leaves for Taishan. At Wenming Garden, Dong Zhuo proposes replacing the emperor with the Prince of Chenliu. Ding Yuan openly denounces him, and Dong Zhuo is prevented from killing Ding Yuan because Lu Bu stands behind him.

Ding Yuan challenges Dong Zhuo outside the city. Lu Bu routs Dong Zhuo's army. Dong Zhuo covets Lu Bu's strength. Li Su, Lu Bu's old acquaintance, takes Red Hare, gold, pearls, and a jade belt to persuade him. Li Su flatters Lu Bu, reveals Dong Zhuo's gifts, and suggests that killing Ding Yuan would be the perfect credential. That night Lu Bu kills Ding Yuan, scatters the army, and presents the head to Dong Zhuo. Dong Zhuo receives Lu Bu as an adopted son, grants him rank, and again convenes officials. With Lu Bu guarding the feast, Dong Zhuo announces the deposition. Yuan Shao draws his sword in defiance, ending the chapter on a dangerous standoff.

## Design Principles

- The chapter should feel like a collapsing state machine: each route watches another institution fail.
- Branches change blame, casualties, later relationships, troop strength, public order, and unlock text, but the core source events converge.
- Playable perspectives should be morally asymmetrical. Some routes are about preventing damage; others are about exploiting damage.
- Combat should be selective. This chapter is mostly intrigue, escort, pursuit, palace fighting, and intimidation, with one full battlefield battle around Ding Yuan and Lu Bu.
- He Jin can be playable only as a doomed prologue branch. His decisions affect aftermath flags, not survival.

## Route Set

### Route A - He Jin: The Summoned Wolf

Role: playable court commander in the opening collapse.

Story promise: He Jin holds legal power but lacks judgment. The player can try to govern the crisis responsibly, but every branch shows how his authority depends on fragile palace access, family politics, and bad advisers.

Route terminal: `hejin_murdered`

Scene arc:
1. Court council after Cao Cao warning - [narrative / choice]
2. Secret edict dispatch - [map / command choice]
3. Dong Zhuo memorial and ministerial objections - [narrative]
4. Empress He's summons - [interactive narrative]
5. Palace gate escort deployment - [tactical setup / no full battle]
6. Jiade Gate assassination - [narrative defeat]

Key choices:
- Listen to Cao Cao:
  - `summon_external_armies`: canonical path. Dong Zhuo gains lawful pretext and later troop legitimacy.
  - `summon_eunuchs_to_trial`: He Jin attempts a lawful arrest first. Empress He blocks the move; eunuchs become more desperate. Unlocks a later line where Cao Cao says He Jin saw the danger too late.
  - `delay_and_secure_palace`: reduces initial palace chaos but causes Zheng Tai and Lu Zhi to leave earlier. Dong Zhuo still marches once the edict is already moving.
- Which commanders receive urgent orders:
  - `dongzhuo_priority`: faster Dong Zhuo arrival; more Xiliang patrols in later maps.
  - `balanced_calls`: Wang Yun/Yuan Shao have more time to organize; later palace battle starts with better loyalist positioning.
  - `recall_order_attempt`: messenger side objective can fail or arrive too late; if completed, gives a later "Dong Zhuo came without waiting" justification.
- Enter the palace:
  - `enter_alone`: canonical arrogance. He Jin dies immediately.
  - `demand_eunuchs_exit`: eunuchs use Empress He's order to overrule him; He Jin still enters, but Yuan Shao has more warning.
  - `accept_guard_to_gate`: extra soldiers reach the gate but cannot enter. Later palace-purge route begins with better breach position.

Gameplay notes:
- This route should be short and tragic, not a full heroic campaign.
- It teaches the player that Chapter 3 branches are about controlling damage.
- He Jin should not survive in a normal completion path. A noncanonical "survive" result would fracture the source too much; use it only as a fail-state/debug branch if ever.

Flags:
- `ch3_hejin_cao_warning_heeded`
- `ch3_hejin_summoned_dongzhuo`
- `ch3_hejin_attempted_recall`
- `ch3_hejin_guard_prepared`
- `ch3_hejin_murdered`

### Route B - Yuan Shao / Cao Cao: Fire at the Palace Gates

Role: playable loyalist purge route with split priorities.

Story promise: Yuan Shao sees a murdered minister and wants vengeance; Cao Cao sees the state burning and tries to preserve what is left. The player chooses how much discipline survives the purge.

Route terminal: `emperor_recovered`

Scene arc:
1. Waiting outside Changle Palace - [narrative tension]
2. He Jin's head thrown from the wall - [title / shock beat]
3. Blue Gate breach - [battle]
4. Inner palace rescue - [battle / rescue objectives]
5. Lu Zhi saves Empress He - [scripted ally event]
6. He Miao accusation - [branching encounter]
7. North Palace pursuit begins - [map / pursuit]
8. Min Gong and Cui Yi recover the emperor - [narrative convergence]

Battle: `ch3_palace_purge`
- Player side: Yuan Shao, Cao Cao, Yuan Shu, Wu Kuang, optional Lu Zhi.
- Enemy side: eunuch guards, palace knife-men, fleeing attendants.
- Civilian/noncombatant eunuch markers should exist as "do not kill" targets if we want the Cao Cao discipline branch.
- Core objectives:
  - Breach the palace gate.
  - Prevent fire from spreading to key palace tiles.
  - Rescue Empress He.
  - Identify Zhang Rang / Duan Gui escape path.
- Optional objectives:
  - Restrain indiscriminate slaughter.
  - Prevent misidentified beardless civilians from being killed.
  - Prevent or allow Wu Kuang killing He Miao.

Key choices:
- Battle doctrine:
  - `vengeance`: Yuan Shao route. Easier combat, higher casualties, faster eunuch collapse, worse public order.
  - `discipline`: Cao Cao route. Harder objectives, lower casualties, better later legitimacy.
  - `split_command`: balanced path. Yuan Shu breaches while Cao Cao controls fire.
- He Miao encounter:
  - `allow_wu_kuang`: source-close. He Miao dies.
  - `attempt_trial`: He Miao still likely dies if palace chaos is high; if discipline is high, he is arrested instead. Later court text changes but He family power is broken either way.
- Pursuit priority:
  - `follow_north_gate`: faster emperor search.
  - `secure_empress`: better palace stability, slower pursuit.
  - `hunt_ten_attendants`: more eunuch families killed, emperor search delayed.

Flags:
- `ch3_palace_fire_severity`
- `ch3_purge_discipline`
- `ch3_empress_rescued`
- `ch3_he_miao_fate`
- `ch3_emperor_search_delay`
- `ch3_emperor_recovered`

### Route C - Prince of Chenliu / Min Gong: Fireflies at Beimang

Role: survival and legitimacy route.

Story promise: The weakest characters in battle determine the empire's next turn. The emperor breaks; the Prince of Chenliu shows nerve; Dong Zhuo notices.

Route terminal: `dongzhuo_marks_chenliu`

Scene arc:
1. Flight through smoke - [narrative]
2. Riverbank hiding after Zhang Rang's death - [stealth / survival]
3. Fireflies through thorns - [navigation vignette]
4. Cui Yi's farm - [narrative refuge]
5. Min Gong finds Duan Gui and the emperor - [short tactical pursuit]
6. Return convoy meets Wang Yun, Yang Biao, Yuan Shao - [map]
7. Dong Zhuo arrival and Chenliu's challenge - [dialogue confrontation]

Gameplay:
- This is not a standard battle route. It should play like a compact survival/interrogation chapter.
- The player may control the Prince of Chenliu in dialogue and movement, with the young emperor as a protected companion.
- Min Gong can get one short pursuit scenario against Duan Gui.

Key choices:
- During hiding:
  - `stay_silent`: avoids patrols, increases hunger/fatigue.
  - `call_for_help`: faster rescue if Min Gong is near, but risk of eunuch scouts.
- Firefly path:
  - Follow the lights closely for source-faithful miracle.
  - Take direct road for speed but higher ambush risk.
- Confront Dong Zhuo:
  - `challenge`: source-close. Chenliu asks whether Dong Zhuo has come to protect or seize the emperor, then orders him to dismount. Dong Zhuo is impressed.
  - `defer`: safer in the moment; Dong Zhuo still notices the emperor's fear and Chenliu's composure.
  - `accuse`: raises Dong Zhuo hostility and later palace intimidation.

Flags:
- `ch3_chenliu_composure`
- `ch3_emperor_fear`
- `ch3_cui_yi_shelter`
- `ch3_min_gong_success`
- `ch3_dongzhuo_marks_chenliu`

### Route D - Dong Zhuo / Li Ru: Enter the Capital

Role: playable consolidation route from the antagonist side.

Story promise: Dong Zhuo is not just an invader; he is an opportunist arriving at the exact moment the court loses its center. The player learns how he turns "rescue" into occupation.

Route terminal: `dongzhuo_controls_luoyang`

Scene arc:
1. Xiliang march after secret summons - [map]
2. Li Ru drafts the memorial - [choice / political framing]
3. Arrival after emperor recovery - [narrative]
4. Troops in Luoyang streets - [map pressure]
5. Recruiting He Jin's scattered soldiers - [resource / influence]
6. Bao Xin warning scene - [opposition route hook]
7. Wenming Garden banquet - [narrative confrontation]
8. Ding Yuan opposition and Lu Bu reveal - [route transition]

Key choices:
- Memorial tone:
  - `lawful_rescue`: lower immediate resistance, stronger court pretext.
  - `anti_eunuch_wrath`: easier military morale, worse court trust.
  - `imperial_protection`: positions Dong Zhuo as protector, but Chenliu confrontation can undercut him.
- City posture:
  - `iron_patrols`: source-close intimidation; public order falls.
  - `controlled_entry`: less panic, slower army integration.
  - `palace_access_first`: accelerates deposition plan but triggers Bao Xin/Yuan Shao suspicion.
- Bao Xin opportunity:
  - If player previously built high loyalist discipline, Bao Xin may propose an early strike in another route.
  - Dong Zhuo route can preempt by moving camp, recruiting He Jin troops, or placing Li Jue/Guo Si patrols.

Flags:
- `ch3_dongzhuo_memorial_tone`
- `ch3_luoyang_public_order`
- `ch3_hejin_troops_absorbed`
- `ch3_baoxin_leaves`
- `ch3_wenming_banquet_called`

### Route E - Ding Yuan / Lu Bu / Li Su: Red Hare

Role: military and betrayal route.

Story promise: Ding Yuan is the only commander who can publicly stop Dong Zhuo, but his power rests on Lu Bu. Li Su turns one man's ambition into a regime change.

Route terminal: `lubu_joins_dongzhuo`

Scene arc:
1. Wenming Garden opposition - [narrative]
2. Lu Bu stands behind Ding Yuan - [intimidation tableau]
3. Ding Yuan challenges Dong Zhuo outside Luoyang - [battle]
4. Dong Zhuo covets Lu Bu - [narrative]
5. Li Su receives Red Hare and treasure - [choice]
6. Li Su enters Lu Bu's camp - [social infiltration]
7. Red Hare inspection - [narrative / temptation]
8. Persuasion over wine - [dialogue duel]
9. Night murder of Ding Yuan - [stealth / scripted betrayal]
10. Lu Bu presents the head and becomes Dong Zhuo's adopted son - [narrative]
11. Final deposition feast with Lu Bu guards - [chapter end]

Battle: `ch3_dingyuan_vs_dongzhuo`
- Preferred player perspective: Ding Yuan / Lu Bu.
- Source-faithful objective: rout Dong Zhuo, force him to retreat thirty li.
- Dong Zhuo side can be an alternate route where the objective is survival and organized retreat, not victory.
- Lu Bu should feel overpowering but not yet fully controllable by player choice.

Li Su social mission:
- Resource gifts:
  - Red Hare is mandatory for the source-faithful persuasion.
  - Gold/pearls/jade belt determine how quickly Lu Bu accepts.
- Persuasion beats:
  - Old friendship.
  - Praise Lu Bu's role in restoring order.
  - Gift Red Hare.
  - Reframe Ding Yuan as merely "today's father."
  - Offer Dong Zhuo as the true patron.
  - Suggest that killing Ding Yuan is the credential Lu Bu lacks.

Key choices:
- Lu Bu's response:
  - `accept_immediately`: source-close; Ding Yuan dies that night.
  - `demand_rank`: Dong Zhuo grants stronger title later; Li Su must promise more.
  - `hesitate`: Li Su must spend extra treasure or appeal to ambition; if persuasion fails, route ends in a temporary Dong Zhuo setback but should be treated as a noncanonical challenge branch.
- Night murder:
  - `clean_betrayal`: fewer Ding Yuan soldiers resist; more troops transfer.
  - `public_accusation`: Lu Bu claims Ding Yuan is unjust; more soldiers scatter.
  - `bloody_camp`: more combat, fewer soldiers join Dong Zhuo.

Flags:
- `ch3_dingyuan_routed_dongzhuo`
- `ch3_red_hare_given`
- `ch3_lisu_persuasion_quality`
- `ch3_lubu_betrayal_style`
- `ch3_dingyuan_dead`
- `ch3_lubu_adopted_by_dongzhuo`

### Route F - Yuan Shao: Sword at the Feast

Role: chapter epilogue and next-chapter hook.

Story promise: With Lu Bu standing behind Dong Zhuo, open resistance becomes almost impossible. Yuan Shao still draws his sword.

Route terminal: `yuanshao_confronts_dongzhuo`

Scene arc:
1. Dong Zhuo's second feast in the ministry - [narrative]
2. Lu Bu and armored guards seal the hall - [tension]
3. Dong Zhuo declares deposition - [choice / silence pressure]
4. Yuan Shao stands - [dialogue confrontation]
5. Sword draw standoff - [chapter cliffhanger]

Branch purpose:
- This should be a short playable epilogue unlocked after the main routes converge.
- The player can choose Yuan Shao's tone:
  - `legal_defiance`: stresses the emperor has no fault.
  - `personal_challenge`: directly calls Dong Zhuo a rebel.
  - `strategic_withdrawal`: lowers immediate danger but weakens Yuan Shao's later prestige.
- Regardless, the chapter ends before resolution, matching the source cliffhanger.

Flags:
- `ch3_yuanshao_defiance_tone`
- `ch3_deposition_announced`
- `ch3_cliffhanger_complete`

## Suggested Chapter Structure in Game Data

```js
3: {
  id: 3,
  title: "Knives in the Palace, Red Hare at the Gate",
  routes: {
    hejin: { id: "chapter3_hejin", title: "The Summoned Wolf" },
    loyalists: { id: "chapter3_loyalists", title: "Fire at the Palace Gates" },
    chenliu: { id: "chapter3_chenliu", title: "Fireflies at Beimang" },
    dongzhuo: { id: "chapter3_dongzhuo", title: "Enter the Capital" },
    lubu: { id: "chapter3_lubu", title: "Red Hare" },
    yuanshao: { id: "chapter3_yuanshao", title: "Sword at the Feast" }
  }
}
```

Unlock proposal:
- Chapter 3 unlocks when Chapter 2 routes are complete.
- He Jin route is first, because it contextualizes the collapse.
- Loyalists and Chenliu routes unlock after `ch3_hejin_murdered`.
- Dong Zhuo route unlocks after `ch3_emperor_recovered`.
- Lu Bu route unlocks after `ch3_wenming_banquet_called`.
- Yuan Shao epilogue unlocks after `ch3_lubu_adopted_by_dongzhuo`.

## Scene List Draft

1. `ch3_hejin_council` - Cao Cao warns against summoning outside troops.
2. `ch3_secret_edicts` - He Jin dispatches edicts; Dong Zhuo receives one and marches.
3. `ch3_dongzhuo_memorial` - Li Ru advises formal pretext; ministers warn He Jin.
4. `ch3_empress_summons` - Ten Attendants persuade Empress He to summon He Jin.
5. `ch3_jiade_gate` - He Jin enters and is killed.
6. `ch3_palace_gate_reveal` - He Jin's head is thrown from the wall.
7. `ch3_palace_purge` - Yuan Shao/Yuan Shu/Cao Cao break into the palace.
8. `ch3_luzhi_rescue` - Lu Zhi saves Empress He; He Miao is killed or arrested.
9. `ch3_beimang_escape` - Emperor and Chenliu hide and follow fireflies.
10. `ch3_cui_yi_farm` - Cui Yi shelters the boys.
11. `ch3_min_gong_search` - Min Gong kills Duan Gui and finds the emperor.
12. `ch3_dongzhuo_meets_emperor` - Chenliu challenges Dong Zhuo.
13. `ch3_luoyang_occupation` - Dong Zhuo absorbs soldiers and frightens the city.
14. `ch3_wenming_garden` - Dong Zhuo proposes deposition; Ding Yuan defies him.
15. `ch3_dingyuan_battle` - Lu Bu routs Dong Zhuo.
16. `ch3_lisu_red_hare` - Li Su takes Red Hare and treasure to Lu Bu.
17. `ch3_lubu_persuaded` - Lu Bu agrees to betray Ding Yuan.
18. `ch3_dingyuan_murder` - Ding Yuan is killed in camp.
19. `ch3_lubu_adoption` - Lu Bu joins Dong Zhuo and receives rank.
20. `ch3_deposition_feast` - Dong Zhuo announces deposition; Yuan Shao draws sword.

## Battles and Interactive Systems

### Battle: Palace Purge

Tone: fire, confusion, moral hazard.

Playable variants:
- Yuan Shao variant: faster and bloodier.
- Cao Cao variant: rescue and containment.

Special rules:
- Fire spreads unless controlled.
- Some units are "suspect attendants" instead of confirmed enemies.
- Killing suspects lowers discipline and increases terror.
- Rescue tiles for Empress He and palace officials.
- Pursuit timer for Zhang Rang / Duan Gui escape.

### Vignette: Beimang Escape

Tone: helplessness and omen.

Systems:
- Low visibility.
- Companion tether between emperor and Chenliu.
- Firefly path as moving guide markers.
- Fear/noise meter.
- Food/fatigue meter until Cui Yi shelter.

### Battle: Ding Yuan vs Dong Zhuo

Tone: one great warrior changes the field.

Playable variants:
- Ding Yuan/Lu Bu: rout Dong Zhuo quickly.
- Dong Zhuo survival: preserve commanders and retreat.

Special rules:
- Lu Bu has overpowering charge and intimidation.
- Dong Zhuo army morale collapses when Lu Bu reaches command range.
- This battle should teach why Dong Zhuo wants Lu Bu more than another regiment.

### Social Mission: Li Su Persuades Lu Bu

Tone: intimacy, flattery, corruption.

Systems:
- Dialogue duel using gift reveals.
- Red Hare inspection moment.
- Persuasion meter with ambition, loyalty, and suspicion.
- Failure can branch to extra cost or noncanonical challenge path, but final source route requires Lu Bu's betrayal.

## Major Characters Needed

- He Jin
- Empress He
- Zhang Rang
- Duan Gui
- Yuan Shao
- Yuan Shu
- Cao Cao
- Lu Zhi
- Wu Kuang
- He Miao
- Min Gong
- Cui Yi
- Young Emperor / Emperor Shao
- Prince of Chenliu / Liu Xie
- Dong Zhuo
- Li Ru
- Bao Xin
- Wang Yun
- Yang Biao
- Ding Yuan
- Lu Bu
- Li Su

## Asset Needs

Likely required portraits:
- He Jin
- Empress He
- Zhang Rang / generic eunuch
- Duan Gui / generic eunuch variant
- Yuan Shao
- Yuan Shu
- Wu Kuang
- He Miao
- Min Gong
- Cui Yi
- Emperor Shao child portrait
- Prince of Chenliu child portrait
- Dong Zhuo
- Li Ru
- Bao Xin
- Wang Yun
- Yang Biao
- Ding Yuan
- Lu Bu
- Li Su

Likely required sprites:
- Eunuch attendants / palace guards
- Child emperor / child prince
- Xiliang cavalry
- Lu Bu mounted or elite infantry sprite
- Red Hare horse prop or sprite

Likely required backgrounds:
- He Jin council chamber
- Changle Palace gate / Jiade Gate
- Burning palace courtyard
- North Palace escape route
- Beimang riverbank
- Cui Yi farm
- Luoyang road return
- Luoyang occupied street
- Wenming Garden banquet
- Ding Yuan camp
- Dong Zhuo camp

## End State and Chapter 4 Hook

Required completion flags:
- `ch3_hejin_murdered`
- `ch3_emperor_recovered`
- `ch3_dongzhuo_controls_luoyang`
- `ch3_lubu_adopted_by_dongzhuo`
- `ch3_yuanshao_confronts_dongzhuo`
- `chapter3_complete`

Chapter 4 should begin from Dong Zhuo's deposition crisis: the emperor's fate, Yuan Shao's danger, Cao Cao's next choices, and the consolidation of Dong Zhuo's tyranny.

## Open Design Questions

- Should He Jin be selectable as a full route card, or should his route be a required prologue before Chapter 3 opens?
- Should the player ever directly play Dong Zhuo, or should Dong Zhuo scenes be framed through Li Ru / Li Su to avoid making the route feel like endorsement?
- Should Lu Bu's betrayal be playable as Lu Bu, or should the player control Li Su and watch Lu Bu make the final choice?
- How punishing should palace-purge indiscriminate killing be? It is source-faithful, but a disciplined route gives Cao Cao more agency and makes later route variance meaningful.
- Should the Prince of Chenliu route be required? It is central to Dong Zhuo's later deposition logic and gives the chapter emotional contrast.
