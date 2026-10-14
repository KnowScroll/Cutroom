---
status: current
authority: the ledger of every run the engine has made, scored from the record it wrote — not a plan; nothing here binds
---

# Benchmark — every run the engine has made, scored part by part

Written by `scripts/benchmark.mjs --rescore` and never typed by hand (S-016's rule, as
`journey.mjs` has it). Read on **2026-10-14** at commit `e9f1266`, over **52 runs**.
Rating version `r1`, measures version `m1`.

A part rating is `absent` where the run never reached that part, and the run rating is `none`
where it reached no part of its own. The rating ranks runs and decides nothing; the `reel`
column is whether a watchable file came out, which no single number is allowed to hide. Two
cut ratings compare only when their stamps match, because S-158 changed the Gate 7 question
set. The scorecard behind every row, with its blobs, is the full record `--out` writes, and
no column here holds a path of any kind.

| run                                    | brief    | until | ending    | reel | plan  | pictures | narration | clips  | cut    | rating | stamp       | ¢   | s      | created              |
| -------------------------------------- | -------- | ----- | --------- | ---- | ----- | -------- | --------- | ------ | ------ | ------ | ----------- | --- | ------ | -------------------- |
| `9cdadf20-5114-401f-b9e2-edb9b555403c` | 4ce40e14 | video | failed    | no   | 0.0   | absent   | absent    | absent | absent | 0.0    | r1/—        | 0   | 1.5    | 2026-09-21T12:59:15Z |
| `80c959ef-c257-4a7c-a64e-cc358c82f758` | 4ce40e14 | video | failed    | no   | 0.0   | absent   | absent    | absent | absent | 0.0    | r1/—        | 0   | 1.6    | 2026-09-21T13:55:47Z |
| `53710655-6348-454f-b9bc-bf974562952a` | 4ce40e14 | video | failed    | no   | 0.0   | absent   | absent    | absent | absent | 0.0    | r1/—        | 0   | 45.5   | 2026-09-22T07:48:40Z |
| `e1adc629-52c4-4d8b-8456-f5a9f1f7a3c4` | 4ce40e14 | video | failed    | no   | 30.0  | absent   | absent    | absent | absent | 3.0    | r1/—        | 0   | 77.6   | 2026-09-22T08:29:22Z |
| `00aa29ec-d532-4784-9c63-5de5aec31c28` | 4ce40e14 | video | failed    | no   | 30.0  | absent   | absent    | absent | absent | 3.0    | r1/—        | 0   | 116.9  | 2026-09-22T08:45:47Z |
| `8f9c921e-5482-48cc-ab7b-938ddff93801` | 4ce40e14 | video | failed    | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 0   | 170.8  | 2026-09-22T08:51:01Z |
| `f9507840-0269-47e1-a603-2c3926461177` | 4ce40e14 | video | failed    | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 0   | 144.6  | 2026-09-22T08:59:33Z |
| `e590de48-3883-4328-bfa0-9a89033d1afc` | 4ce40e14 | video | stopped   | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 15  | 345.2  | 2026-09-22T09:04:08Z |
| `4938925b-3c8c-4d91-8c5a-fa550570f742` | e2028bd0 | video | failed    | no   | 30.0  | absent   | absent    | absent | absent | 3.0    | r1/—        | 0   | 139.8  | 2026-09-22T09:55:30Z |
| `5df208e3-d83b-4fe3-bdc9-e85d28eac038` | e2028bd0 | video | failed    | no   | 30.0  | absent   | absent    | absent | absent | 3.0    | r1/—        | 0   | 114.2  | 2026-09-22T10:01:21Z |
| `87227235-472b-46ad-803d-7e611ced482d` | e2028bd0 | video | failed    | no   | 30.0  | absent   | absent    | absent | absent | 3.0    | r1/—        | 0   | 235.8  | 2026-09-22T10:13:20Z |
| `56a0a2b2-f773-4fdd-bbbd-7ca13c6cbf7d` | e2028bd0 | video | stopped   | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 15  | 326.7  | 2026-09-22T10:17:49Z |
| `bef01ee5-7018-403d-9c62-129c7cfb6deb` | 396a6ae3 | video | failed    | no   | 100.0 | 45.0     | absent    | absent | absent | 23.5   | r1/—        | 34  | 356.8  | 2026-09-22T10:23:50Z |
| `c4c9b112-f891-4954-9d33-1cd9ef1ad441` | 396a6ae3 | video | failed    | no   | 100.0 | 76.7     | 75.0      | 65.0   | absent | 60.0   | r1/—        | 98  | 401.0  | 2026-09-22T10:31:06Z |
| `4ce2d176-674a-452f-a7f0-39290dc0e034` | 396a6ae3 | video | failed    | no   | 100.0 | 38.3     | absent    | absent | absent | 21.5   | r1/—        | 23  | 233.9  | 2026-09-22T10:41:32Z |
| `46354140-1f3c-4308-aa0f-247533ee163d` | 396a6ae3 | video | stopped   | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 15  | 216.5  | 2026-09-22T10:48:42Z |
| `ffbd04b5-a00f-4675-bb67-36e90f69c417` | af844544 | video | stopped   | no   | 100.0 | 72.0     | 100.0     | 74.0   | 68.0   | 77.4   | r1/70e2a3e2 | 202 | 794.8  | 2026-09-22T11:12:37Z |
| `ad65acbe-4084-499d-ad86-03f364470eed` | 4e9d5d80 | video | failed    | no   | 100.0 | 0.0      | 100.0     | 92.5   | absent | 47.8   | r1/—        | 152 | 362.7  | 2026-09-22T16:02:20Z |
| `f895e76d-1567-4cd5-8b5e-6e1a04dcf72f` | db460dea | video | completed | yes  | 100.0 | 0.0      | 100.0     | 80.0   | 80.0   | 60.0   | r1/70e2a3e2 | 160 | 448.5  | 2026-09-23T08:23:21Z |
| `a08a9c9c-9d10-41bd-9f81-215edfef871f` | db460dea | video | stopped   | no   | 100.0 | 100.0    | 100.0     | 64.5   | absent | 69.3   | r1/—        | 231 | 725.4  | 2026-09-23T12:48:52Z |
| `436564c1-7c6b-4d65-a8b5-a47de1c060ca` | 69d38fcb | video | completed | yes  | 100.0 | 82.5     | 100.0     | 74.0   | 80.0   | 83.0   | r1/70e2a3e2 | 228 | 1652.3 | 2026-09-23T13:33:29Z |
| `ee63e617-bc5c-423a-9593-6306441045bf` | bdb2b73f | video | failed    | no   | 100.0 | 100.0    | 62.5      | 0.0    | absent | 46.3   | r1/—        | 15  | 217.8  | 2026-09-23T18:31:15Z |
| `879a27b7-78e5-446b-a3b2-079dcea76d43` | 35460231 | video | stopped   | no   | 100.0 | 55.0     | 87.5      | 40.0   | absent | 47.3   | r1/—        | 53  | 509.1  | 2026-09-23T18:50:01Z |
| `c9f3df47-1d8a-49b5-9769-3f852169e6df` | c161d7cd | video | failed    | no   | 100.0 | 85.0     | absent    | absent | absent | 35.5   | r1/—        | 10  | 136.7  | 2026-09-23T19:08:02Z |
| `c52d418a-025c-44eb-a428-ff058246fd0a` | c161d7cd | video | failed    | no   | 100.0 | 50.0     | absent    | absent | absent | 25.0   | r1/—        | 15  | 159.5  | 2026-09-23T19:13:01Z |
| `12a097bf-d3e5-48d0-8b68-f83fc80239ac` | c161d7cd | video | stopped   | no   | 100.0 | 55.0     | 100.0     | 85.0   | 68.0   | 75.6   | r1/70e2a3e2 | 45  | 654.9  | 2026-09-24T09:59:51Z |
| `af7447f0-7dd9-4c53-93a8-1b1ff3d047a3` | c161d7cd | video | stopped   | no   | 100.0 | 72.0     | 91.7      | 52.6   | absent | 56.5   | r1/—        | 60  | 722.3  | 2026-09-24T12:06:21Z |
| `05611ff9-cade-47fc-ae61-7a0be565244e` | 6763176f | video | completed | yes  | 100.0 | 100.0    | 100.0     | 72.9   | 80.0   | 87.9   | r1/0223d983 | 53  | 806.8  | 2026-09-24T12:43:30Z |
| `124f1124-04c3-4d30-ba85-3d16dbf5f81a` | 83e92f9e | video | failed    | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 0   | 85.3   | 2026-09-24T17:21:27Z |
| `9b23d24a-69e1-4980-b09f-38088ece0106` | 83e92f9e | video | failed    | no   | 100.0 | 65.0     | absent    | absent | absent | 29.5   | r1/—        | 10  | 211.7  | 2026-09-24T17:24:57Z |
| `bad736d1-a36b-43c7-9843-3899c57ca011` | 83e92f9e | video | failed    | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 0   | 91.4   | 2026-09-24T17:31:54Z |
| `bf8f4444-81d3-48b0-a640-8e0b6f03efb8` | 83e92f9e | video | stopped   | no   | 100.0 | 82.5     | 100.0     | 81.4   | 65.0   | 82.2   | r1/0223d983 | 55  | 783.0  | 2026-09-24T17:38:03Z |
| `74bb96a0-651e-4f54-bf6b-27aba2816dc4` | f1662a60 | video | completed | yes  | 100.0 | 62.0     | 100.0     | 86.7   | 80.0   | 80.6   | r1/0223d983 | 56  | 653.0  | 2026-09-24T19:06:31Z |
| `d4d6c562-1af4-453c-b6f9-683d0f957d9b` | 64e83890 | video | failed    | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 0   | 118.2  | 2026-09-25T16:17:31Z |
| `62b5a191-e3c8-46db-842e-f1616b02dc37` | a366464a | video | failed    | no   | 100.0 | 85.0     | absent    | absent | absent | 35.5   | r1/—        | 10  | 161.7  | 2026-09-25T16:26:17Z |
| `d459f6f5-2b20-419b-a398-3cf981f03741` | a366464a | video | completed | yes  | 100.0 | 100.0    | 100.0     | 81.4   | 100.0  | 94.4   | r1/0223d983 | 49  | 621.7  | 2026-09-25T16:50:57Z |
| `9d0914dd-5691-4d84-9cc5-7e6084f2a4c5` | 64e83890 | video | stopped   | no   | 100.0 | 100.0    | 100.0     | 78.9   | 65.0   | 86.7   | r1/0223d983 | 54  | 820.8  | 2026-09-25T17:03:24Z |
| `0ac13e84-81ef-4a25-83d7-fad5d1e1d365` | 1053a9ac | video | stopped   | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 15  | 227.1  | 2026-09-25T17:20:22Z |
| `9bc5821e-c6dc-4d71-a420-df04417e3bcc` | 872e59f1 | video | failed    | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 0   | 121.4  | 2026-09-25T17:25:54Z |
| `52c63f62-4838-449f-b963-70372e9cb958` | 872e59f1 | video | stopped   | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 15  | 205.1  | 2026-09-25T17:29:06Z |
| `098e97fd-6e02-4867-b72d-a1c60c60d873` | 182fde13 | video | completed | yes  | 100.0 | 62.0     | 100.0     | 93.3   | 80.0   | 82.6   | r1/0223d983 | 53  | 692.8  | 2026-09-25T17:34:07Z |
| `a1cb6cfb-76ae-471e-904d-33b25ca69b3f` | c67352cf | video | stopped   | no   | 100.0 | 21.7     | 75.0      | 17.1   | absent | 29.1   | r1/—        | 75  | 872.7  | 2026-09-25T18:20:12Z |
| `cd9648c9-7a13-4ebf-a088-d155121824df` | f984199a | video | failed    | no   | 30.0  | absent   | absent    | absent | absent | 3.0    | r1/—        | 0   | 126.3  | 2026-09-25T18:36:24Z |
| `a469e36b-ffc1-4b64-b411-156870766c8a` | f984199a | video | failed    | no   | 100.0 | 21.7     | 66.7      | 75.0   | absent | 45.7   | r1/—        | 51  | 682.6  | 2026-09-25T18:41:18Z |
| `1496bbb9-b607-429f-9f7f-b3f6f0a7c5cd` | f984199a | video | failed    | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 0   | 87.9   | 2026-09-25T18:54:48Z |
| `fdff208b-b8f2-4379-a842-10a98ac1b641` | f984199a | video | failed    | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 0   | 112.2  | 2026-09-25T19:02:08Z |
| `8475f26d-eec7-4811-ba77-09303698c15c` | f984199a | video | stopped   | no   | 100.0 | 21.7     | 87.5      | 44.0   | absent | 38.5   | r1/—        | 71  | 966.5  | 2026-09-26T10:32:14Z |
| `f44e960b-aaff-4bcb-b026-5cfb06641766` | 4c1efc21 | video | stopped   | no   | 100.0 | 0.0      | absent    | absent | absent | 10.0   | r1/—        | 15  | 197.5  | 2026-09-26T10:49:18Z |
| `a5b76d45-7c98-40fb-8b14-880a79d25ca6` | 8b8ca1f9 | video | stopped   | no   | 100.0 | 43.3     | 87.5      | 43.3   | absent | 44.8   | r1/—        | 73  | 928.8  | 2026-09-26T10:54:26Z |
| `d12931e1-6f78-4911-85a1-a90346627c4e` | 3dd85971 | video | completed | yes  | 100.0 | 21.7     | 100.0     | 85.0   | 80.0   | 68.0   | r1/0223d983 | 58  | 781.9  | 2026-09-26T11:10:44Z |
| `8d233d6e-e5b1-434c-975c-dc8a7c2e3020` | f7804542 | video | stopped   | no   | 100.0 | 55.0     | 87.5      | 40.0   | absent | 47.3   | r1/—        | 52  | 809.5  | 2026-09-26T11:24:52Z |
| `a1b8f2ee-071d-47f1-bea0-44b216e15906` | cbc9df22 | video | completed | yes  | 100.0 | 72.0     | 100.0     | 83.3   | 80.0   | 82.6   | r1/0223d983 | 53  | 2447.7 | 2026-09-26T11:39:21Z |
