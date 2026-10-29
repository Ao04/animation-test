# 夜の部屋でタイピングする女の子（4秒・フルHD）

Remotion と手書き風の Canvas 2D 描画キットで作った 2D アニメーションです。
画像素材やフォントは一切使わず、背景・キャラクター・文字・光・紙の質感まで
すべてコードで描いています。効果音も Python（numpy のみ）で合成しています。

- 完成動画: `renders/typing.mp4`（1920×1080 / 30fps / 4秒 / H.264 + AAC）

## 使い方

```bash
npm install
npm run audio    # 効果音とタイピングのタイミング表を生成（python3 + numpy）
npm run studio   # ブラウザでプレビュー・コマ送り
npm run render   # out/typing.mp4 を書き出し
```

## 仕組み

```
sfx/build_audio.py      タイミングの「台本」と効果音を同時に生成
  ├─ src/timeline.json    どの指が・いつ・どのキーを押すか（アニメが読む）
  └─ public/sfx.wav       打鍵音・Enter・部屋の環境音・PCファン・遠くの虫の声
src/kit/                手書き風 Canvas 2D キット
  ├─ pen.ts               揺らぎのある線（毎フレーム揺れない、固定の手描き感）
  ├─ texture.ts           紙の質感・フィルムグレイン
  └─ math.ts              イージング・バネ・2関節IK・ノイズ
src/scene/
  ├─ character.ts         キャラクターのリグ（腰→胴→首→頭、IKの腕、指）
  ├─ motion.ts            台本から各時刻のポーズを計算（瞬き・頷き・髪の揺れ等）
  ├─ room.ts              部屋・窓・ポスター・机・ノートPC・ランプ・マグの湯気
  ├─ letters.ts           ポスターの手書き文字
  └─ lighting.ts          夜の環境光、ランプの暖色光、画面の青い光、ブルーム、埃
```

音と動きは同じ `timeline.json` から作られるので、指がキーに当たる瞬間と
打鍵音が一致します（誤差 2ms 以内）。

## 変更のしかた（例）

| やりたいこと | 場所 |
| --- | --- |
| タイピングの速さ・休憩・Enter の時刻・瞬き | `sfx/build_audio.py` の `BURSTS` / `PAUSE` / `ENTER_T` / `BLINKS` → `npm run audio` |
| 服・髪・肌などの色 | `src/scene/layout.ts` の `C` |
| 机・PC・椅子などの配置 | `src/scene/layout.ts` |
| 表情（眉・目・口）や動きの大きさ | `src/scene/motion.ts` / `src/scene/character.ts` |
| 光の強さや雰囲気 | `src/scene/lighting.ts` |
| 長さ | `sfx/build_audio.py` の `DURATION` |

## この方式の限界と代替案

- **カメラアングル**: 2D の手続き描画なので、横向き・正面など「決めた角度」の
  絵は作れますが、キャラクターが振り向く・回り込むといった角度の変化は、
  角度ごとに描き分けが必要で一気に難しくなります。
  → 大きく動くシーンは Blender（グリースペンシル）や Live2D / Spine が向いています。
- **手描きの線の表情**: 線の強弱や「描き直しの揺れ（ラインボイル）」は再現できますが、
  原画マンが描くような繊細な崩し・デフォルメはコードでは限界があります。
  → 重要なカットだけ手描き素材（PNG）を描いてもらい、Remotion で合成する方法が現実的です。
- **長尺**: 数十秒以上になると、ポーズや演出をコードで書く量が増えます。
  → ストーリーものは Blender / After Effects、またはキーフレームをGUIで打てる
  Rive・Spine などとの併用が効率的です。
- **効果音**: 合成音なので打鍵音・環境音は自然に作れますが、声や楽器のような
  複雑な音は本物の録音素材や専用ツールの方が品質が高くなります。
