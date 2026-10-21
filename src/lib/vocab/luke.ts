/**
 * 누가복음 영어 단어장 데이터. 만드는 방식은 `mark.ts` 와 같다 — NIV 본문은 옮기지 않고
 * 단어·뜻·절 번호·직접 쓴 예문만 둔다. 마가·마태복음에 나온 단어는 뺀다(`build.ts`).
 */
import { buildWords, mergeChapters } from "./build";
import { LUKE_MORE_A } from "./lukeMore1";
import { LUKE_MORE_B } from "./lukeMore2";
import { MARK_WORDS } from "./mark";
import { MATTHEW_WORDS } from "./matthew";
import type { Row } from "./types";

const BASE: Row[][] = [
  // 1
  [
    [2, "eyewitness", "n.", "목격자", "An eyewitness saw the accident.", "목격자가 그 사고를 보았다."],
    [3, "orderly", "adj.", "차례대로의, 질서 있는", "He wrote an orderly account.", "그는 차례대로 기록을 썼다."],
    [6, "blameless", "adj.", "흠 없는", "They lived a blameless life.", "그들은 흠 없이 살았다."],
    [7, "barren", "adj.", "아이를 못 낳는, 메마른", "Elizabeth was barren.", "엘리사벳은 아이를 낳지 못했다."],
    [9, "incense", "n.", "향", "The priest burned incense.", "제사장이 향을 피웠다."],
    [15, "womb", "n.", "태, 자궁", "He will be filled with the Spirit from the womb.", "그는 모태에서부터 성령이 충만할 것이다."],
    [28, "favored", "adj.", "은혜를 입은", "You are highly favored!", "은혜를 크게 입은 자여!"],
    [29, "greatly troubled", "adj.", "몹시 놀란", "Mary was greatly troubled.", "마리아는 몹시 놀랐다."],
    [41, "leap", "v.", "뛰다", "The baby leaped in her womb.", "아기가 태중에서 뛰놀았다."],
    [48, "humble state", "n.", "낮은 처지", "He has looked on my humble state.", "그가 나의 낮은 처지를 돌아보셨다."],
    [49, "mighty", "adj.", "능하신, 강한", "The Mighty One has done great things.", "능하신 분이 큰일을 하셨다."],
    [51, "proud", "adj.", "교만한, 자랑스러운", "He scattered the proud.", "그는 교만한 자들을 흩으셨다."],
    [59, "circumcise", "v.", "할례를 하다", "On the eighth day they came to circumcise him.", "팔 일째에 그들이 할례를 하러 왔다."],
    [63, "writing tablet", "n.", "글 쓰는 판", "He asked for a writing tablet.", "그는 글 쓰는 판을 달라고 했다."],
    [78, "tender", "adj.", "자애로운, 부드러운", "Because of the tender mercy of our God.", "우리 하나님의 자비로운 긍휼로."],
  ],
  // 2
  [
    [1, "census", "n.", "인구 조사", "A census was taken of the whole world.", "온 세상에 인구 조사가 있었다."],
    [1, "decree", "n.", "칙령, 명령", "The emperor issued a decree.", "황제가 칙령을 내렸다."],
    [7, "manger", "n.", "구유", "She laid him in a manger.", "그녀는 그를 구유에 뉘었다."],
    [7, "inn", "n.", "여관", "There was no room in the inn.", "여관에는 방이 없었다."],
    [8, "keep watch", "v.", "밤새 지키다", "Shepherds kept watch over their flocks.", "목자들이 양 떼를 지켰다."],
    [19, "treasure up", "v.", "마음에 간직하다", "Mary treasured up all these things.", "마리아는 이 모든 것을 마음에 간직했다."],
    [19, "ponder", "v.", "곰곰이 생각하다", "She pondered them in her heart.", "그녀는 그것들을 마음에 깊이 새겼다."],
    [25, "devout", "adj.", "경건한", "Simeon was righteous and devout.", "시므온은 의롭고 경건한 사람이었다."],
    [24, "turtledove", "n.", "산비둘기", "They offered a pair of turtledoves.", "그들은 산비둘기 한 쌍을 드렸다."],
    [36, "prophetess", "n.", "여선지자", "Anna was a prophetess.", "안나는 여선지자였다."],
    [52, "grow in wisdom", "v.", "지혜가 자라다", "Jesus grew in wisdom and stature.", "예수님은 지혜와 키가 자라셨다."],
  ],
  // 3
  [
    [1, "emperor", "n.", "황제", "The emperor ruled the empire.", "황제가 제국을 다스렸다."],
    [5, "valley", "n.", "골짜기", "Every valley shall be filled in.", "모든 골짜기가 메워질 것이다."],
    [5, "crooked", "adj.", "굽은", "The crooked roads shall become straight.", "굽은 길이 곧게 될 것이다."],
    [5, "rough", "adj.", "거친, 울퉁불퉁한", "The rough ways shall become smooth.", "거친 길이 평탄하게 될 것이다."],
    [14, "extort", "v.", "강요해서 빼앗다", "Don't extort money from anyone.", "아무에게도 돈을 갈취하지 마라."],
    [14, "wages", "n.", "임금, 봉급", "Be content with your wages.", "받는 봉급에 만족하라."],
    [15, "expectation", "n.", "기대", "The people were full of expectation.", "백성이 기대에 차 있었다."],
  ],
  // 4
  [
    [17, "scroll", "n.", "두루마리", "He unrolled the scroll.", "그는 두루마리를 펴셨다."],
    [18, "captive", "n.", "포로, 갇힌 자", "He proclaims freedom for the captives.", "포로 된 자에게 자유를 선포한다."],
    [18, "release", "n.", "풀려남, 석방", "Release for the prisoners.", "갇힌 자에게 풀려남을."],
    [18, "oppressed", "adj.", "억눌린", "He sets the oppressed free.", "억눌린 자를 자유롭게 하신다."],
    [19, "favor", "n.", "은혜, 호의", "The year of the Lord's favor.", "주의 은혜의 해."],
    [20, "attendant", "n.", "시중드는 사람", "He gave the scroll back to the attendant.", "그는 두루마리를 시중드는 사람에게 돌려주셨다."],
    [24, "accepted", "adj.", "받아들여진", "No prophet is accepted in his hometown.", "선지자는 고향에서 환영받지 못한다."],
    [26, "Zarephath", "n.", "사르밧(지명)", "A widow in Zarephath fed Elijah.", "사르밧의 과부가 엘리야를 먹였다."],
    [29, "cliff", "n.", "벼랑, 절벽", "They led him to the edge of the cliff.", "그들은 그를 벼랑 끝으로 끌고 갔다."],
    [29, "brow", "n.", "(언덕의) 꼭대기, 이마", "The town was built on the brow of a hill.", "그 동네는 언덕 꼭대기에 있었다."],
    [35, "throw down", "v.", "내던지다", "The demon threw the man down.", "귀신이 그 사람을 내던졌다."],
  ],
  // 5
  [
    [4, "deep water", "n.", "깊은 물", "Put out into deep water.", "깊은 데로 나가라."],
    [6, "break", "v.", "찢어지다", "Their nets began to break.", "그물이 찢어지기 시작했다."],
    [8, "sinful", "adj.", "죄 많은", "I am a sinful man!", "나는 죄 많은 사람입니다!"],
    [10, "partner", "n.", "동업자, 동료", "James and John were Simon's partners.", "야고보와 요한은 시몬의 동업자였다."],
    [27, "tax booth", "n.", "세관", "Levi sat at his tax booth.", "레위는 세관에 앉아 있었다."],
    [29, "banquet", "n.", "잔치", "Levi held a great banquet for Jesus.", "레위가 예수님을 위해 큰 잔치를 열었다."],
    [37, "burst", "v.", "터지다", "The new wine will burst the skins.", "새 포도주가 부대를 터뜨릴 것이다."],
  ],
  // 6
  [
    [24, "woe", "n.", "화(禍), 재앙", "Woe to you who are rich!", "부유한 너희에게 화가 있다!"],
    [28, "mistreat", "v.", "학대하다", "Pray for those who mistreat you.", "너희를 학대하는 사람을 위해 기도하라."],
    [34, "lend", "v.", "빌려주다", "If you lend to those who can repay...", "갚을 사람에게만 빌려주면..."],
    [38, "overflowing", "adj.", "넘치는", "A good measure, pressed down and overflowing.", "누르고 흔들어 넘치도록."],
    [41, "log", "n.", "들보, 통나무", "Take the log out of your own eye.", "네 눈의 들보를 먼저 빼라."],
    [41, "sawdust", "n.", "톱밥, 티", "You see the sawdust in your brother's eye.", "너는 형제 눈의 티를 본다."],
    [48, "flood", "n.", "홍수", "When a flood came, the house stood firm.", "홍수가 나도 집은 굳게 섰다."],
  ],
  // 7
  [
    [2, "valued", "adj.", "소중히 여겨진", "He was a servant who was valued highly.", "그는 귀하게 여겨진 종이었다."],
    [14, "bier", "n.", "관, 상여", "He touched the bier.", "그가 관에 손을 대셨다."],
    [15, "sit up", "v.", "일어나 앉다", "The dead man sat up.", "죽은 사람이 일어나 앉았다."],
    [41, "moneylender", "n.", "돈놀이하는 사람", "A moneylender had two debtors.", "돈놀이하는 사람에게 채무자 둘이 있었다."],
    [41, "owe", "v.", "빚지다", "One owed him five hundred denarii.", "한 사람은 오백 데나리온을 빚졌다."],
  ],
  // 8
  [
    [1, "proclaim", "v.", "선포하다", "He went from town to town proclaiming the good news.", "그는 마을마다 다니며 복음을 선포하셨다."],
    [3, "support", "v.", "후원하다", "These women supported them out of their means.", "이 여인들이 자기 재산으로 그들을 후원했다."],
    [13, "fall away", "v.", "떨어져 나가다", "In the time of testing they fall away.", "시련의 때에 그들은 떨어져 나간다."],
    [14, "pleasure", "n.", "쾌락, 즐거움", "They are choked by life's pleasures.", "그들은 인생의 쾌락에 막힌다."],
    [41, "Jairus", "n.", "야이로", "Jairus fell at Jesus' feet.", "야이로가 예수님의 발 앞에 엎드렸다."],
  ],
  // 9
  [
    [14, "fifty", "n.", "쉰, 오십", "Have them sit in groups of fifty.", "쉰 명씩 앉게 하라."],
    [31, "departure", "n.", "떠남, 별세", "They spoke about his departure.", "그들은 그의 떠나심에 대해 말했다."],
    [43, "majesty", "n.", "위엄", "They were amazed at God's majesty.", "그들은 하나님의 위엄에 놀랐다."],
    [54, "call down", "v.", "내리게 하다", "Do you want us to call fire down from heaven?", "하늘에서 불을 내리라고 할까요?"],
    [62, "plow", "n.", "쟁기", "No one who puts a hand to the plow...", "쟁기에 손을 얹고..."],
    [62, "look back", "v.", "뒤를 돌아보다", "Do not look back.", "뒤를 돌아보지 마라."],
  ],
  // 10
  [
    [1, "seventy-two", "n.", "일흔둘", "He sent out seventy-two others.", "그는 다른 일흔두 명을 보내셨다."],
    [3, "lamb", "n.", "어린 양", "I am sending you out like lambs among wolves.", "내가 양을 이리 가운데 보내듯 너희를 보낸다."],
    [4, "purse", "n.", "전대, 지갑", "Do not take a purse.", "전대를 가지지 마라."],
    [30, "robber", "n.", "강도", "He fell into the hands of robbers.", "그는 강도들을 만났다."],
    [30, "half dead", "adj.", "반쯤 죽은", "They left him half dead.", "그들은 그를 반쯤 죽은 채 두고 갔다."],
    [34, "bandage", "v.", "붕대를 감다", "He bandaged his wounds.", "그는 상처를 싸매 주었다."],
    [35, "innkeeper", "n.", "여관 주인", "He gave the innkeeper two coins.", "그는 여관 주인에게 은화 두 개를 주었다."],
    [40, "distracted", "adj.", "정신이 산만한", "Martha was distracted by all the preparations.", "마르다는 준비하느라 정신이 없었다."],
  ],
  // 11
  [
    [8, "boldness", "n.", "뻔뻔함, 대담함", "Because of his boldness he will get up and give.", "그의 간청 때문에 일어나 줄 것이다."],
    [12, "scorpion", "n.", "전갈", "Would he give him a scorpion?", "전갈을 주겠느냐?"],
    [17, "ruin", "n.", "멸망, 폐허", "A kingdom divided will be ruined.", "나뉜 나라는 망한다."],
    [42, "rue", "n.", "운향(허브)", "You give a tenth of your mint and rue.", "너희는 박하와 운향의 십일조를 드린다."],
    [44, "unmarked", "adj.", "표시 없는", "You are like unmarked graves.", "너희는 표시 없는 무덤 같다."],
    [45, "expert", "n.", "전문가", "An expert in the law answered.", "율법 전문가가 말했다."],
  ],
  // 12
  [
    [20, "fool", "n.", "어리석은 사람", "You fool! This very night your life will be demanded.", "어리석은 자여! 오늘 밤 네 영혼을 거두겠다."],
    [24, "raven", "n.", "까마귀", "Consider the ravens.", "까마귀를 생각해 보라."],
    [33, "wear out", "v.", "닳아 없어지다", "Purses that will not wear out.", "낡지 않는 지갑."],
    [35, "dressed", "adj.", "차려입은, 준비된", "Be dressed ready for service.", "섬길 준비를 하고 있어라."],
    [42, "manager", "n.", "관리자", "Who is the faithful and wise manager?", "충성되고 지혜로운 관리인이 누구냐?"],
    [51, "division", "n.", "분열", "I came to bring division.", "나는 분열을 일으키러 왔다."],
  ],
  // 13
  [
    [1, "Galilean", "n.", "갈릴리 사람", "Pilate killed some Galileans.", "빌라도가 갈릴리 사람들을 죽였다."],
    [4, "tower", "n.", "망대, 탑", "The tower in Siloam fell.", "실로암의 망대가 무너졌다."],
    [11, "bent over", "adj.", "허리가 굽은", "A woman was bent over for eighteen years.", "한 여인이 열여덟 해 동안 허리가 굽어 있었다."],
    [12, "set free", "v.", "풀어 주다", "Woman, you are set free from your infirmity.", "여인아, 네 병에서 놓였다."],
    [13, "straighten", "v.", "곧게 펴다", "She straightened up and praised God.", "그녀는 허리를 펴고 하나님을 찬양했다."],
    [24, "effort", "n.", "노력", "Make every effort to enter through the narrow door.", "좁은 문으로 들어가려고 힘쓰라."],
    [32, "fox", "n.", "여우", "Go tell that fox.", "가서 그 여우에게 전하라."],
  ],
  // 14
  [
    [2, "dropsy", "n.", "수종병", "A man suffering from dropsy stood before him.", "수종병 걸린 사람이 그 앞에 있었다."],
    [9, "humiliation", "n.", "수치, 굴욕", "You will have to take the lowest place in humiliation.", "부끄러움을 당하며 낮은 자리로 가게 된다."],
    [18, "excuse", "n.", "핑계", "They all began to make excuses.", "그들은 다 핑계를 대기 시작했다."],
    [28, "estimate", "v.", "어림해 보다", "Won't he estimate the cost?", "비용을 먼저 계산해 보지 않겠느냐?"],
    [34, "lose saltiness", "v.", "짠맛을 잃다", "If salt loses its saltiness...", "소금이 짠맛을 잃으면..."],
  ],
  // 15
  [
    [8, "drachma", "n.", "드라크마(은전)", "A woman lost one of her ten silver coins.", "한 여인이 열 드라크마 중 하나를 잃었다."],
    [8, "sweep", "v.", "쓸다", "She sweeps the house.", "그녀는 집을 쓴다."],
    [13, "squander", "v.", "낭비하다", "He squandered his wealth in wild living.", "그는 방탕하게 살며 재산을 낭비했다."],
    [15, "feed pigs", "v.", "돼지를 치다", "He went to feed pigs.", "그는 돼지를 치러 갔다."],
    [16, "pod", "n.", "꼬투리", "He longed to eat the pods the pigs ate.", "그는 돼지가 먹는 꼬투리라도 먹고 싶었다."],
    [20, "embrace", "v.", "껴안다", "His father threw his arms around him.", "아버지가 그를 껴안았다."],
    [22, "robe", "n.", "겉옷, 예복", "Bring the best robe.", "가장 좋은 옷을 가져오너라."],
    [22, "ring", "n.", "반지", "Put a ring on his finger.", "손에 반지를 끼워라."],
    [23, "celebrate", "v.", "축하하다", "Let's have a feast and celebrate.", "잔치하며 즐기자."],
  ],
  // 16
  [
    [1, "squander", "v.", "낭비하다", "A manager was accused of squandering his master's goods.", "청지기가 주인의 재산을 낭비한다고 고발되었다."],
    [6, "olive oil", "n.", "올리브기름", "He owed a hundred measures of olive oil.", "그는 올리브기름 백 말을 빚졌다."],
    [8, "dishonest", "adj.", "정직하지 못한", "The master praised the dishonest manager.", "주인은 불의한 청지기를 칭찬했다."],
    [10, "trustworthy", "adj.", "믿을 만한", "Whoever can be trusted with little...", "작은 일에 신실한 사람은..."],
    [20, "sore", "n.", "헌데, 종기", "A beggar covered with sores was laid at his gate.", "헌데투성이 거지가 그의 대문 앞에 있었다."],
    [23, "agony", "n.", "고통", "He was in agony in Hades.", "그는 음부에서 고통당했다."],
    [26, "chasm", "n.", "큰 구렁텅이", "A great chasm has been set between us.", "우리 사이에 큰 구렁이 놓여 있다."],
  ],
  // 17
  [
    [6, "mulberry tree", "n.", "뽕나무", "You could say to this mulberry tree...", "이 뽕나무더러 말하면..."],
    [10, "unworthy", "adj.", "무익한, 자격 없는", "We are unworthy servants.", "우리는 무익한 종입니다."],
    [28, "Lot", "n.", "롯", "It was the same in the days of Lot.", "롯의 때에도 그러했다."],
    [33, "preserve", "v.", "보존하다", "Whoever loses his life will preserve it.", "목숨을 잃는 자는 보존할 것이다."],
  ],
  // 18
  [
    [2, "unjust", "adj.", "불의한", "There was an unjust judge.", "불의한 재판관이 있었다."],
    [3, "persistent", "adj.", "끈질긴", "The persistent widow kept coming.", "끈질긴 과부가 계속 찾아갔다."],
    [13, "beat his breast", "v.", "가슴을 치다", "He beat his breast and prayed.", "그는 가슴을 치며 기도했다."],
    [18, "ruler", "n.", "관리, 통치자", "A certain ruler asked him.", "어떤 관리가 그에게 물었다."],
    [35, "Jericho", "n.", "여리고", "He approached Jericho.", "그가 여리고에 가까이 가셨다."],
  ],
  // 19
  [
    [2, "Zacchaeus", "n.", "삭개오", "Zacchaeus was a chief tax collector.", "삭개오는 세리장이었다."],
    [4, "sycamore-fig", "n.", "뽕나무(돌무화과)", "He climbed a sycamore-fig tree.", "그는 돌무화과나무에 올라갔다."],
    [12, "nobleman", "n.", "귀족", "A man of noble birth went to a distant country.", "귀족이 먼 나라로 갔다."],
    [13, "mina", "n.", "므나(화폐 단위)", "He gave ten servants ten minas.", "그는 종 열 명에게 열 므나를 주었다."],
    [20, "piece of cloth", "n.", "수건", "I kept it laid away in a piece of cloth.", "나는 수건에 싸 두었습니다."],
    [40, "cry out", "v.", "소리치다", "The stones will cry out.", "돌들이 소리칠 것이다."],
    [41, "weep over", "v.", "위해 울다", "He wept over the city.", "그는 그 성을 보고 우셨다."],
    [43, "embankment", "n.", "둑, 토성", "Your enemies will build an embankment against you.", "원수들이 너를 둘러 토성을 쌓을 것이다."],
  ],
  // 20
  [
    [20, "spy", "n.", "첩자", "They sent spies.", "그들은 첩자들을 보냈다."],
    [20, "pretend", "v.", "~인 체하다", "The spies pretended to be honest.", "첩자들은 정직한 척했다."],
    [21, "honest", "adj.", "정직한", "We know you speak honestly.", "당신이 바르게 말하는 줄 압니다."],
    [47, "devour", "v.", "삼키다, 먹어 치우다", "They devour widows' houses.", "그들은 과부의 집을 삼킨다."],
  ],
  // 21
  [
    [5, "adorned", "adj.", "꾸며진", "The temple was adorned with beautiful stones.", "성전은 아름다운 돌로 꾸며져 있었다."],
    [14, "defense", "n.", "변호, 방어", "Make up your mind not to worry about your defense.", "변명을 미리 생각하지 마라."],
    [20, "army", "n.", "군대", "When you see Jerusalem surrounded by armies...", "예루살렘이 군대에 포위되는 것을 보거든..."],
    [25, "perplexity", "n.", "당혹, 혼란", "Nations will be in anguish and perplexity.", "민족들이 혼란과 괴로움에 빠질 것이다."],
    [26, "terror", "n.", "공포", "Men will faint from terror.", "사람들이 공포로 기절할 것이다."],
    [34, "weighed down", "adj.", "짓눌린", "Be careful, or your hearts will be weighed down.", "마음이 무거워지지 않게 조심하라."],
    [34, "carousing", "n.", "흥청망청 노는 것", "Be careful of carousing and drunkenness.", "방탕과 술 취함을 조심하라."],
    [35, "snare", "n.", "올무, 덫", "That day will close on you like a snare.", "그날이 올무처럼 닥칠 것이다."],
  ],
  // 22
  [
    [31, "sift", "v.", "체질하다", "Satan has asked to sift you as wheat.", "사탄이 너희를 밀처럼 체질하려 한다."],
    [41, "stone's throw", "n.", "돌 던질 만한 거리", "He withdrew about a stone's throw.", "그는 돌 던질 만큼 떨어져 가셨다."],
    [43, "strengthen", "v.", "힘을 주다", "An angel appeared to strengthen him.", "천사가 나타나 그에게 힘을 주었다."],
    [44, "sweat", "n.", "땀", "His sweat was like drops of blood.", "그의 땀이 핏방울 같았다."],
    [45, "grief", "n.", "슬픔", "He found them asleep, exhausted from grief.", "그는 슬픔에 지쳐 잠든 그들을 보셨다."],
    [55, "kindle", "v.", "불을 붙이다", "They kindled a fire in the courtyard.", "그들은 뜰에 불을 피웠다."],
    [63, "mock", "v.", "조롱하다", "The men began mocking and beating him.", "사람들이 그를 조롱하고 때렸다."],
  ],
  // 23
  [
    [2, "subvert", "v.", "선동하다, 뒤엎다", "They accused him of subverting our nation.", "그들은 그가 민족을 선동한다고 고발했다."],
    [33, "skull", "n.", "해골", "They came to the place called the Skull.", "그들은 해골이라는 곳에 이르렀다."],
    [35, "scoff", "v.", "비웃다", "The rulers even sneered at him.", "관리들도 그를 비웃었다."],
    [43, "paradise", "n.", "낙원", "Today you will be with me in paradise.", "오늘 네가 나와 함께 낙원에 있을 것이다."],
    [46, "commit", "v.", "맡기다", "Into your hands I commit my spirit.", "아버지 손에 내 영혼을 맡깁니다."],
    [54, "Preparation Day", "n.", "준비일", "It was Preparation Day.", "그날은 준비일이었다."],
  ],
  // 24
  [
    [11, "nonsense", "n.", "터무니없는 말", "They thought the women's words were nonsense.", "그들은 여인들의 말을 터무니없다고 생각했다."],
    [13, "Emmaus", "n.", "엠마오", "Two of them were going to Emmaus.", "그들 중 둘이 엠마오로 가고 있었다."],
    [25, "slow of heart", "adj.", "마음이 둔한", "How slow of heart you are to believe!", "마음이 둔하여 믿지 못하는구나!"],
    [32, "burning", "adj.", "뜨거운", "Were not our hearts burning within us?", "우리 마음이 뜨겁지 않았더냐?"],
    [42, "broiled", "adj.", "구운", "They gave him a piece of broiled fish.", "그들은 구운 생선 한 토막을 드렸다."],
    [42, "honeycomb", "n.", "벌집", "And some honeycomb.", "벌집도 드렸다."],
    [45, "open one's mind", "v.", "깨닫게 하다", "He opened their minds so they could understand.", "그는 그들의 마음을 열어 깨닫게 하셨다."],
    [49, "clothed with power", "adj.", "능력으로 입혀진", "Stay until you are clothed with power.", "능력으로 옷 입을 때까지 머물러라."],
    [50, "Bethany", "n.", "베다니", "He led them out to Bethany.", "그는 그들을 베다니까지 데리고 나가셨다."],
  ],
];

const CHAPTERS = mergeChapters(BASE, [...LUKE_MORE_A, ...LUKE_MORE_B]);

export const LUKE_WORDS = buildWords("lk", CHAPTERS, [MARK_WORDS, MATTHEW_WORDS]);
export const LUKE_CHAPTERS = CHAPTERS.map((_, i) => i + 1);
