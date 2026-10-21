/**
 * 초등학생이 이미 아는 쉬운 단어. 단어장에서는 뺀다 — 모르는 단어만 남겨야 「더 학습」이 의미가 있다.
 *
 * 마가·마태복음은 이 걸러내기 전에 만들어서 쉬운 단어가 조금 섞여 있다(단어 id 가 순번이라
 * 지금 걸러 내면 저장된 진도가 밀린다). 누가·요한·여호수아부터 이 목록을 쓴다.
 * 쉬운 단어인데 남아 있거나 어려운 단어가 빠졌으면 여기에 더하고 빼면 된다.
 */
export const EASY_WORDS = new Set(
  [
    "life", "voice", "king", "queen", "mother", "father", "son", "run", "world", "fire", "night", "day", "way",
    "know", "keep", "believe", "speak", "follow", "go", "walk", "early", "end", "heaven", "truth", "work", "food",
    "one", "die", "leave", "love", "stand", "learn", "fill", "taste", "market", "poor", "rich", "stay", "carry",
    "bed", "fish", "cloud", "eye", "key", "clothes", "relax", "friend", "village", "crowd", "wars", "always",
    "leaf", "hate", "hurry", "question", "shout", "show", "serve", "teach", "house", "water", "bread", "door",
    "light", "dark", "darkness", "heart", "hand", "head", "foot", "peace", "joy", "wrote", "pieces", "man",
    "woman", "child", "children", "city", "town", "road", "street", "gold", "silver", "star", "sun", "moon",
    "sky", "earth", "sea", "river", "mountain", "hill", "field", "tree", "grass", "stone", "rock", "sand",
    "wind", "rain", "snow", "dog", "sheep", "bird", "snake", "horse", "lamb", "pig", "wolf", "fox", "hen",
    "angry", "sad", "happy", "afraid", "strong", "weak", "big", "small", "old", "new", "good", "bad", "great",
    "kind", "dead", "alive", "free", "full", "empty", "open", "close", "near", "far", "high", "low", "long",
    "short", "hot", "cold", "wet", "dry", "clean", "sick", "well", "ready", "alone", "together", "lost",
    "found", "wait", "come", "give", "take", "make", "see", "look", "hear", "say", "tell", "ask", "answer",
    "call", "pray", "eat", "drink", "sleep", "wake", "sit", "rise", "fall", "jump", "climb", "cry", "laugh",
    "smile", "sing", "dance", "play", "help", "save", "kill", "fight", "win", "lose", "find", "buy", "sell",
    "pay", "send", "bring", "put", "set", "turn", "change", "move", "stop", "start", "begin", "finish",
    "meet", "visit", "return", "enter", "think", "wish", "hope", "need", "want", "like", "feel", "try",
    "use", "name", "word", "book", "letter", "story", "song", "gift", "money", "coin", "bag", "box",
    "cup", "bowl", "table", "chair", "wall", "gate", "roof", "floor", "window", "garden", "farm", "farmer",
    "doctor", "teacher", "soldier", "servant", "master", "boy", "girl", "baby", "friend", "brother", "sister",
    "mother-in-law", "family", "people", "crowd", "group", "army", "enemy", "guest", "neighbor", "stranger",
    "thirty", "forty", "fifty", "hundred", "thousand", "thousands", "second", "first", "last", "next",
    "yard", "mile", "room", "command", "right", "left", "kingdom", "troubled", "praise", "example", "breakfast",
    "garden", "kiss", "wrap", "pour", "wipe", "wash", "clean", "pick", "throw", "break", "hold", "pull", "push",
    "cut", "tear", "tie", "fly", "swim", "ride", "sail", "row", "dig", "plow", "sow", "reap", "plant",
    "baptize", "angel", "mercy", "peace", "wisdom", "power", "glory", "spirit", "soul", "sin", "pray",
    "lay", "bury", "grave", "tomb", "cave", "cross", "crown", "robe", "ring", "belt", "shirt", "shoe",
    "boat", "ship", "net", "hook", "rope", "chain", "sword", "spear", "arrow", "wine", "oil", "salt",
    "honey", "milk", "meat", "fruit", "seed", "root", "branch", "flower", "thorn", "wheat", "barley",
    "taller", "better", "worse", "greater", "greatest", "larger", "smaller", "heavy", "light-weight",
  ].map((w) => w.toLowerCase()),
);
