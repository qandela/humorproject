# Week 5 iteration review

## Provenance

The user asked to continue using invented suggestions instead of a real feedback session. The suggestions below are explicitly **hypothetical usability feedback**, created to guide this iteration. They are not attributed to a real PM or classmate, and no completed feedback session is claimed.

## Hypothetical suggestions and changes

| Hypothetical user suggestion | Resulting change | How it is checked |
| --- | --- | --- |
| “I want to find the captions I made without searching the whole feed.” | Added a private My captions collection with published captions and unfinished attempts. | Browser fixture checks saved history; PostgreSQL tests enforce owner-only request reads. |
| “After signing in, take me back to the caption I was rating.” | The login flow retains a validated internal destination in an HttpOnly cookie. The OAuth callback remains exactly `/auth/callback`. | Return-path unit tests reject external URLs; auth/browser checks verify retained destinations. |
| “Let me try another angle on a scene that already works.” | Added Remix this scene to public captions and Reuse this scene to private history. | Browser checks confirm scene/topic/tone are populated correctly. |
| “I want the actual caption text for my group chat, not only a website link.” | Added separate Copy text and Copy link controls with feedback. | Chrome clipboard check. |
| “Does Pass skip the card or count against it?” | Replaced Pass with Not quite, displayed +1/−1, and explained that one final vote is saved per caption. | Browser checks vote persistence and disabled saved-vote controls; SQL tests reject duplicate votes. |
| “I don’t want to lose my scene and mood when generation fails.” | Controlled scene/topic/tone inputs preserve edits, with clearer failure messages and remaining-attempt information. | Browser simulates a reservation error and checks all form values remain. |
| “The layout should be easier to scan on my phone.” | Refined typography, spacing, contrast, navigation, mobile cards, and the single-caption view. | Desktop/mobile screenshots and horizontal-overflow checks. |

## Actual feedback still to collect

During the real session, ask the PM or classmates to create a caption, vote, find a past creation, and share a caption. Record their exact feedback here, then add the agreed change, implementation commit, and verification. Replace assumptions only with feedback that actually occurred.
