/**
 * 요한복음 영어 단어장 데이터. 만드는 방식은 `mark.ts` 와 같다 — NIV 본문은 옮기지 않고
 * 단어·뜻·절 번호·직접 쓴 예문만 둔다. 마가·마태·누가복음에 나온 단어는 뺀다(`build.ts`).
 */
import { buildWords, mergeChapters } from "./build";
import { JOHN_MORE } from "./johnMore";
import { LUKE_WORDS } from "./luke";
import { MARK_WORDS } from "./mark";
import { MATTHEW_WORDS } from "./matthew";
import type { Row } from "./types";

const BASE: Row[][] = [
  // 1
  [
    [1, "the Word", "n.", "말씀(로고스)", "In the beginning was the Word.", "태초에 말씀이 계셨다."],
    [5, "overcome", "v.", "이기다", "The darkness has not overcome it.", "어둠이 그것을 이기지 못했다."],
    [14, "flesh", "n.", "육신, 살", "The Word became flesh.", "말씀이 육신이 되셨다."],
    [14, "dwelling", "n.", "거처", "He made his dwelling among us.", "그가 우리 가운데 거하셨다."],
    [14, "grace", "n.", "은혜", "He was full of grace and truth.", "그는 은혜와 진리가 충만하셨다."],
    [29, "Lamb of God", "n.", "하나님의 어린 양", "Look, the Lamb of God!", "보라, 하나님의 어린 양이다!"],
    [42, "Cephas", "n.", "게바(베드로)", "You will be called Cephas.", "너는 게바라 불릴 것이다."],
    [45, "Nathanael", "n.", "나다나엘", "Philip found Nathanael.", "빌립이 나다나엘을 찾았다."],
    [51, "ascending", "adj.", "올라가는", "Angels ascending and descending.", "천사들이 오르락내리락한다."],
  ],
  // 2
  [
    [1, "Cana", "n.", "가나", "A wedding took place at Cana.", "가나에서 혼인 잔치가 있었다."],
    [6, "water jar", "n.", "물 항아리", "Six stone water jars stood there.", "돌로 된 물 항아리 여섯이 놓여 있었다."],
    [8, "master of the banquet", "n.", "연회장", "Take it to the master of the banquet.", "연회장에게 가져다주어라."],
    [10, "choice wine", "n.", "좋은 포도주", "You saved the best till now.", "좋은 포도주를 이제까지 두었다."],
    [15, "whip", "n.", "채찍", "He made a whip out of cords.", "그는 노끈으로 채찍을 만드셨다."],
    [15, "scatter", "v.", "흩어 버리다", "He scattered the coins.", "그는 동전을 흩어 버리셨다."],
    [17, "zeal", "n.", "열심", "Zeal for your house will consume me.", "주의 집을 향한 열심이 나를 삼킬 것이다."],
    [19, "raise up", "v.", "일으키다", "I will raise it up in three days.", "내가 사흘 만에 그것을 일으키겠다."],
    [24, "entrust", "v.", "맡기다", "Jesus would not entrust himself to them.", "예수님은 그들에게 자신을 맡기지 않으셨다."],
  ],
  // 3
  [
    [1, "Nicodemus", "n.", "니고데모", "Nicodemus came to Jesus by night.", "니고데모가 밤에 예수님께 왔다."],
    [3, "born again", "adj.", "다시 태어난", "No one can see the kingdom unless born again.", "다시 태어나지 않으면 나라를 볼 수 없다."],
    [8, "blow", "v.", "(바람이) 불다", "The wind blows wherever it pleases.", "바람은 불고 싶은 대로 분다."],
    [14, "lift up", "v.", "들어 올리다", "Moses lifted up the snake in the desert.", "모세가 광야에서 뱀을 들어 올렸다."],
    [16, "only Son", "n.", "독생자", "God gave his one and only Son.", "하나님이 독생자를 주셨다."],
    [19, "verdict", "n.", "판결", "This is the verdict: light has come.", "이것이 판결이다. 빛이 왔다."],
    [20, "expose", "v.", "드러내다", "He fears his deeds will be exposed.", "자기 행위가 드러날까 두려워한다."],
    [29, "bride", "n.", "신부", "The bride belongs to the bridegroom.", "신부는 신랑의 것이다."],
    [30, "become less", "v.", "작아지다", "He must become greater; I must become less.", "그는 흥하고 나는 쇠해야 한다."],
  ],
  // 4
  [
    [11, "bucket", "n.", "두레박", "You have nothing to draw with.", "물 길을 두레박도 없으십니다."],
    [10, "living water", "n.", "생수", "He would have given you living water.", "그가 네게 생수를 주었을 것이다."],
    [14, "spring", "n.", "샘", "A spring of water welling up to eternal life.", "영생에 이르도록 솟아나는 샘물."],
    [28, "water jar", "n.", "물동이", "She left her water jar.", "그녀는 물동이를 두고 갔다."],
    [36, "reaper", "n.", "거두는 사람", "The sower and the reaper rejoice together.", "씨 뿌리는 사람과 거두는 사람이 함께 기뻐한다."],
    [46, "royal official", "n.", "왕의 신하", "A royal official's son was ill.", "왕의 신하의 아들이 병들었다."],
  ],
  // 5
  [
    [2, "pool", "n.", "못, 연못", "Near the sheep gate was a pool.", "양문 곁에 못이 있었다."],
    [2, "colonnade", "n.", "주랑(기둥 복도)", "It had five covered colonnades.", "그곳에는 다섯 개의 주랑이 있었다."],
    [5, "invalid", "n.", "병자", "An invalid lay there for thirty-eight years.", "병자가 서른여덟 해 동안 누워 있었다."],
    [7, "stirred", "adj.", "물결이 일어나는", "When the water is stirred, no one helps me.", "물이 움직일 때 나를 넣어 줄 사람이 없다."],
    [8, "pick up", "v.", "집어 들다", "Pick up your mat and walk.", "자리를 들고 걸어가라."],
    [18, "equal", "adj.", "동등한", "He made himself equal with God.", "그는 자신을 하나님과 동등하게 하셨다."],
    [31, "testify", "v.", "증언하다", "If I testify about myself...", "내가 나 자신에 대해 증언하면..."],
    [39, "diligently", "adv.", "부지런히, 열심히", "You study the Scriptures diligently.", "너희는 성경을 부지런히 연구한다."],
  ],
  // 6
  [
    [9, "barley", "n.", "보리", "A boy had five barley loaves.", "한 소년에게 보리빵 다섯 개가 있었다."],
    [15, "by force", "adv.", "억지로", "They intended to make him king by force.", "그들은 억지로 그를 왕으로 삼으려 했다."],
    [18, "rough", "adj.", "거센", "A strong wind was blowing and the waters grew rough.", "강한 바람이 불어 물결이 거셌다."],
    [19, "row", "v.", "노를 젓다", "They had rowed about three miles.", "그들은 오 리쯤 노를 저어 갔다."],
    [31, "manna", "n.", "만나", "Our ancestors ate manna.", "우리 조상들은 만나를 먹었다."],
    [35, "bread of life", "n.", "생명의 떡", "I am the bread of life.", "내가 생명의 떡이다."],
    [44, "draw", "v.", "이끌다", "No one can come unless the Father draws him.", "아버지가 이끌지 않으면 올 수 없다."],
    [54, "feed on", "v.", "먹다, 양식으로 삼다", "Whoever feeds on my flesh has eternal life.", "내 살을 먹는 사람은 영생을 얻는다."],
    [60, "hard teaching", "n.", "어려운 가르침", "This is a hard teaching.", "이 말씀은 어렵다."],
    [66, "turn back", "v.", "돌아가다", "Many of his disciples turned back.", "많은 제자가 돌아갔다."],
  ],
  // 7
  [
    [2, "Feast of Tabernacles", "n.", "초막절", "The Feast of Tabernacles was near.", "초막절이 가까웠다."],
    [12, "whisper", "v.", "수군거리다", "There was widespread whispering about him.", "그에 대해 수군거림이 많았다."],
    [15, "learning", "n.", "배움, 학식", "How did this man get such learning?", "이 사람이 어떻게 이런 학식을 얻었느냐?"],
    [32, "temple guard", "n.", "성전 경비병", "They sent temple guards to arrest him.", "그들은 성전 경비병을 보내 잡게 했다."],
    [49, "cursed", "adj.", "저주받은", "This mob is cursed.", "이 무리는 저주받았다."],
  ],
  // 8
  [
    [3, "caught", "adj.", "붙잡힌", "A woman caught in adultery.", "간음하다 붙잡힌 여인."],
    [7, "without sin", "adj.", "죄 없는", "Let the one without sin throw the first stone.", "죄 없는 사람이 먼저 돌을 던져라."],
    [9, "convicted", "adj.", "양심에 찔린", "Those who heard began to go away, convicted.", "양심에 찔려 하나둘 떠나갔다."],
    [12, "light of the world", "n.", "세상의 빛", "I am the light of the world.", "나는 세상의 빛이다."],
    [32, "set free", "v.", "자유롭게 하다", "The truth will set you free.", "진리가 너희를 자유롭게 할 것이다."],
    [34, "slave", "n.", "종, 노예", "Everyone who sins is a slave to sin.", "죄짓는 사람은 죄의 종이다."],
    [44, "murderer", "n.", "살인자", "He was a murderer from the beginning.", "그는 처음부터 살인자였다."],
    [44, "liar", "n.", "거짓말쟁이", "He is a liar and the father of lies.", "그는 거짓말쟁이요 거짓의 아비다."],
  ],
  // 9
  [
    [6, "mud", "n.", "진흙", "He made mud with saliva.", "그는 침으로 진흙을 만드셨다."],
    [7, "Siloam", "n.", "실로암", "Go, wash in the Pool of Siloam.", "실로암 못에 가서 씻어라."],
    [22, "put out of the synagogue", "v.", "회당에서 쫓아내다", "Anyone who confessed would be put out of the synagogue.", "고백하는 사람은 회당에서 쫓겨날 것이었다."],
    [31, "godly", "adj.", "경건한", "God listens to the godly person.", "하나님은 경건한 사람의 말을 들으신다."],
    [34, "steep in sin", "adj.", "죄 가운데 태어난", "You were steeped in sin at birth.", "너는 온통 죄 가운데 태어났다."],
  ],
  // 10
  [
    [1, "sheep pen", "n.", "양의 우리", "The man who does not enter the sheep pen by the gate...", "문으로 양 우리에 들어가지 않는 사람은..."],
    [3, "gatekeeper", "n.", "문지기", "The gatekeeper opens the gate.", "문지기가 문을 열어 준다."],
    [11, "good shepherd", "n.", "선한 목자", "I am the good shepherd.", "나는 선한 목자다."],
    [12, "hired hand", "n.", "삯꾼", "The hired hand runs away.", "삯꾼은 달아난다."],
    [12, "scatter", "v.", "흩어 버리다", "The wolf scatters the flock.", "이리가 양 떼를 흩어 버린다."],
    [22, "Dedication", "n.", "수전절(봉헌절)", "It was the Feast of Dedication.", "수전절이었다."],
    [28, "snatch", "v.", "낚아채다", "No one can snatch them out of my hand.", "아무도 그들을 내 손에서 빼앗지 못한다."],
  ],
  // 11
  [
    [3, "illness", "n.", "병", "The one you love has an illness.", "주께서 사랑하시는 사람이 병들었습니다."],
    [11, "fall asleep", "v.", "잠들다", "Our friend Lazarus has fallen asleep.", "우리 친구 나사로가 잠들었다."],
    [16, "Thomas", "n.", "도마", "Thomas said, Let us also go.", "도마가 우리도 가자고 말했다."],
    [39, "stench", "n.", "악취", "By this time there is a bad odor.", "벌써 냄새가 납니다."],
    [44, "strips of linen", "n.", "베 조각(수의)", "His hands and feet were wrapped with strips of linen.", "손발이 베로 싸여 있었다."],
    [44, "grave clothes", "n.", "수의", "Take off the grave clothes.", "수의를 풀어 주어라."],
    [50, "perish", "v.", "멸망하다", "It is better that one man die than the nation perish.", "한 사람이 죽는 것이 민족 전체가 망하는 것보다 낫다."],
  ],
  // 12
  [
    [6, "money bag", "n.", "돈 주머니", "He was in charge of the money bag.", "그가 돈 주머니를 맡고 있었다."],
    [13, "palm branch", "n.", "종려나무 가지", "They took palm branches and went out.", "그들은 종려 가지를 들고 나갔다."],
    [24, "kernel", "n.", "알갱이", "Unless a kernel of wheat falls to the ground...", "밀알 하나가 땅에 떨어져..."],
    [29, "thunder", "n.", "천둥", "The crowd said it had thundered.", "무리는 천둥이 쳤다고 했다."],
    [31, "prince", "n.", "통치자", "Now the prince of this world will be driven out.", "이제 이 세상의 통치자가 쫓겨날 것이다."],
    [40, "blind", "v.", "눈멀게 하다", "He has blinded their eyes.", "그가 그들의 눈을 멀게 하셨다."],
  ],
  // 13
  [
    [4, "towel", "n.", "수건", "He wrapped a towel around his waist.", "그는 허리에 수건을 두르셨다."],
    [5, "basin", "n.", "대야", "He poured water into a basin.", "그는 대야에 물을 부으셨다."],
    [26, "piece of bread", "n.", "빵 조각", "It is the one to whom I give this piece of bread.", "내가 빵 조각을 주는 사람이 그다."],
    [31, "glorify", "v.", "영광스럽게 하다", "God will glorify the Son.", "하나님이 아들에게 영광을 주실 것이다."],
  ],
  // 14
  [
    [16, "Advocate", "n.", "보혜사, 돕는 분", "He will give you another Advocate.", "그가 다른 보혜사를 주실 것이다."],
    [18, "orphan", "n.", "고아", "I will not leave you as orphans.", "너희를 고아처럼 버려두지 않겠다."],
  ],
  // 15
  [
    [1, "vine", "n.", "포도나무", "I am the true vine.", "나는 참 포도나무다."],
    [1, "gardener", "n.", "농부, 정원사", "My Father is the gardener.", "내 아버지는 농부이시다."],
    [2, "prune", "v.", "가지치기하다", "He prunes every branch that bears fruit.", "열매 맺는 가지는 다 깨끗하게 하신다."],
    [4, "remain", "v.", "머물다", "Remain in me.", "내 안에 머물러라."],
    [13, "lay down", "v.", "내놓다", "Greater love has no one than this: to lay down one's life.", "자기 목숨을 내놓는 것보다 큰 사랑은 없다."],
    [16, "choose", "v.", "택하다", "You did not choose me, but I chose you.", "너희가 나를 택한 것이 아니라 내가 너희를 택했다."],
    [22, "excuse", "n.", "변명", "Now they have no excuse for their sin.", "이제 그들은 죄에 대해 변명할 수 없다."],
  ],
  // 16
  [
    [2, "put out", "v.", "내쫓다", "They will put you out of the synagogue.", "그들이 너희를 회당에서 내쫓을 것이다."],
    [6, "grief", "n.", "슬픔", "Grief has filled your hearts.", "슬픔이 너희 마음에 가득하다."],
    [8, "convict", "v.", "깨우치다", "He will convict the world of guilt.", "그가 세상의 죄를 깨닫게 하실 것이다."],
    [13, "guide", "v.", "인도하다", "The Spirit of truth will guide you.", "진리의 영이 너희를 인도하실 것이다."],
    [21, "labor", "n.", "산통, 진통", "A woman giving birth has pain because her labor has come.", "해산하는 여인은 때가 되어 근심한다."],
  ],
  // 17
  [
    [11, "protect", "v.", "보호하다", "Holy Father, protect them.", "거룩하신 아버지, 그들을 보호하소서."],
    [17, "sanctify", "v.", "거룩하게 하다", "Sanctify them by the truth.", "진리로 그들을 거룩하게 하소서."],
    [23, "unity", "n.", "하나 됨", "May they be brought to complete unity.", "그들이 온전히 하나 되게 하소서."],
  ],
  // 18
  [
    [1, "Kidron Valley", "n.", "기드론 골짜기", "He crossed the Kidron Valley.", "그는 기드론 골짜기를 건너셨다."],
    [3, "detachment", "n.", "부대", "Judas led a detachment of soldiers.", "유다가 군대를 이끌고 왔다."],
    [3, "torch", "n.", "횃불", "They carried torches.", "그들은 횃불을 들고 있었다."],
    [3, "lantern", "n.", "등불", "They had lanterns and weapons.", "그들은 등불과 무기를 가졌다."],
    [10, "Malchus", "n.", "말고", "The servant's name was Malchus.", "그 종의 이름은 말고였다."],
    [18, "charcoal fire", "n.", "숯불", "They stood around a charcoal fire.", "그들은 숯불 곁에 서 있었다."],
    [28, "Praetorium", "n.", "총독 관저", "They took Jesus to the Praetorium.", "그들은 예수님을 총독 관저로 끌고 갔다."],
  ],
  // 19
  [
    [13, "Gabbatha", "n.", "가바다(박석)", "The place was called Gabbatha.", "그곳은 가바다라 불렸다."],
    [20, "Latin", "n.", "라틴어", "The sign was written in Aramaic, Latin and Greek.", "죄패는 히브리어, 라틴어, 그리스어로 쓰였다."],
    [23, "seamless", "adj.", "이음새 없는", "The tunic was seamless.", "그 속옷은 이음새가 없었다."],
    [23, "woven", "adj.", "짠", "It was woven in one piece.", "한 폭으로 짜여 있었다."],
    [29, "hyssop", "n.", "우슬초", "They put the sponge on a hyssop branch.", "그들은 스펀지를 우슬초 가지에 매달았다."],
    [34, "pierce", "v.", "찌르다", "One of the soldiers pierced his side with a spear.", "한 군인이 창으로 그의 옆구리를 찔렀다."],
    [34, "spear", "n.", "창", "He used a spear.", "그는 창을 사용했다."],
    [39, "aloes", "n.", "침향", "He brought myrrh and aloes.", "그는 몰약과 침향을 가져왔다."],
  ],
  // 20
  [
    [7, "burial cloth", "n.", "수건(장례 천)", "The burial cloth was folded up separately.", "얼굴 수건은 따로 개켜져 있었다."],
    [15, "gardener", "n.", "정원사", "She thought he was the gardener.", "그녀는 그가 정원사인 줄 알았다."],
    [22, "breathe", "v.", "숨을 내쉬다", "He breathed on them.", "그가 그들에게 숨을 불어넣으셨다."],
    [25, "nail", "n.", "못", "Unless I see the nail marks in his hands...", "그의 손의 못 자국을 보지 않으면..."],
    [27, "doubt", "v.", "의심하다", "Stop doubting and believe.", "의심하지 말고 믿어라."],
  ],
  // 21
  [
    [1, "Tiberias", "n.", "디베랴", "At the Sea of Tiberias he showed himself.", "디베랴 호수에서 자신을 나타내셨다."],
    [3, "catch nothing", "v.", "아무것도 잡지 못하다", "That night they caught nothing.", "그날 밤 그들은 아무것도 잡지 못했다."],
    [11, "haul", "v.", "끌어올리다", "Simon Peter hauled the net ashore.", "시몬 베드로가 그물을 뭍으로 끌어올렸다."],
    [18, "stretch out", "v.", "내밀다", "You will stretch out your hands.", "네가 팔을 벌릴 것이다."],
  ],
];

const CHAPTERS = mergeChapters(BASE, JOHN_MORE);

export const JOHN_WORDS = buildWords("jn", CHAPTERS, [MARK_WORDS, MATTHEW_WORDS, LUKE_WORDS]);
export const JOHN_CHAPTERS = CHAPTERS.map((_, i) => i + 1);
