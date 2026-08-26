/**
 * Bible Reading Helper content (English) — Genesis 1–12
 *
 * Mirrors scripts/content/genesis-01-12.js chapter for chapter, question for
 * question, in the same order. The upload script pairs them by (book, chapter)
 * and by question index, so **do not add, drop, or reorder questions here.**
 * If the Korean file gains a question, add the matching one here too.
 *
 * Same voice as the Korean: plain words a middle-schooler can read, short
 * sentences, only what the passage actually says.
 *
 * memoryVerse lives in the Korean file only — the English verse text is pulled
 * from the app's own English Bible (open_en), so nothing is retranslated here.
 */


module.exports = [
  {
    book: 1,
    chapter: 1,
    summary:
      'This is the story of God making the world. Where there was nothing, one word from God brought light. Over six days God made the sky and the land, the seas and the plants, the sun and moon and stars, the fish and birds and animals, one after another. Each time He made something, He said it was "good." Last of all He made people — and only of people does it say they were made "in the image of God." It means He made them to be like Himself. Then He put the whole earth into their care.',
    questions: [
      {
        type: 'choice',
        question: 'What did God make on the first day?',
        choices: ['Light', 'The sun and moon', 'Fish and birds', 'People'],
        correctIndex: 0,
        explanation:
          'On the first day God said, "Let there be light," and there was light. The sun, moon and stars came on the fourth day.',
      },
      {
        type: 'choice',
        question: 'What does the Bible say people were made in the likeness of?',
        choices: ['The dust of the ground', 'The image of God', 'The form of angels', 'The form of animals'],
        correctIndex: 1,
        explanation:
          'It says, "God created man in his own image, in the image of God he created him." It means people are special — made to be like God.',
      },
      {
        type: 'choice',
        question: 'What did God say when He looked at what He had made?',
        choices: ['It is a pity', 'It is good', 'It is not enough', 'It is frightening'],
        correctIndex: 1,
        explanation:
          'Each time He made something God said it was "good," and when it was all finished He said it was "very good."',
      },
      {
        type: 'choice',
        question: 'How many days did it take God to make the world?',
        choices: ['Six days', 'Three days', 'Seven days', 'Ten days'],
        correctIndex: 0,
        explanation: 'God made the world in six days and rested on the seventh.',
      },
      {
        type: 'choice',
        question: 'On which day were the sun, moon and stars made?',
        choices: ['The first day', 'The second day', 'The fourth day', 'The sixth day'],
        correctIndex: 2,
        explanation:
          'On the fourth day God made the lights in the sky to separate day from night and to mark seasons, days and years.',
      },
      {
        type: 'choice',
        question: 'What work did God give to people?',
        choices: [
          'To rule over every living thing on the earth',
          'To fly in the sky',
          'To count the stars',
          'To part the sea',
        ],
        correctIndex: 0,
        explanation:
          'God told people to fill the earth and rule it, caring for the fish, the birds and the animals. It does not mean doing as they please with them — it means being trusted to look after them well.',
      },
      {
        type: 'choice',
        question: '"In the beginning God created the ____." What belongs in the blank?',
        choices: [
          'The heavens and the earth',
          'The sun and the moon',
          'Light and darkness',
          'People and animals',
        ],
        correctIndex: 0,
        explanation:
          'This is the first sentence of Genesis. It declares that the sky and the land — the whole world — began with God.',
      },
    ],
  },
  {
    book: 1,
    chapter: 2,
    summary:
      'If chapter 1 tells how the whole world was made, chapter 2 shows the making of people up close. God rested on the seventh day and made that day holy. Then He shaped a man from the dust and breathed the breath of life into his nose. He put the man in the garden of Eden to tend it, and told him one thing only: do not eat the fruit of the tree of the knowledge of good and evil. God said it was not good for the man to be alone, so He made a woman, and the two became husband and wife.',
    questions: [
      {
        type: 'choice',
        question: 'What did God use to make the man?',
        choices: ['The dust of the ground', 'Water', 'Wood', 'Stone'],
        correctIndex: 0,
        explanation:
          'God shaped the man from the dust of the ground and breathed the breath of life into his nose, and the man became a living being.',
      },
      {
        type: 'choice',
        question: 'What did God tell the man not to eat?',
        choices: [
          'The fruit of the tree of life',
          'The fruit of the tree of the knowledge of good and evil',
          'Every fruit in the middle of the garden',
          'The fruit of the fig tree',
        ],
        correctIndex: 1,
        explanation:
          'He could eat from every tree in the garden — only the fruit of the tree of the knowledge of good and evil was forbidden.',
      },
      {
        type: 'choice',
        question: 'What did God do on the seventh day?',
        choices: ['Made light', 'Rested and blessed that day', 'Made people', 'Sent rain'],
        correctIndex: 1,
        explanation:
          'God finished His work and rested on the seventh day. He blessed that day and made it holy.',
      },
      {
        type: 'choice',
        question: 'What is the name of the garden where God put the man?',
        choices: ['Eden', 'Canaan', 'Goshen', 'Moriah'],
        correctIndex: 0,
        explanation: 'God planted a garden in the east, in Eden, and put the man He had made there.',
      },
      {
        type: 'choice',
        question: 'What did God say was "not good"?',
        choices: [
          'That the man was alone',
          'That the man worked',
          'That the garden had many trees',
          'That a river flowed there',
        ],
        correctIndex: 0,
        explanation:
          'In chapter 1 God kept saying "good." Here, for the first time, He says "not good" — the man being alone. So He made a helper suited to him.',
      },
      {
        type: 'choice',
        question: 'What did God give the man to do in the garden of Eden?',
        choices: ['To tend and keep the garden', 'To do nothing at all', 'To hunt', 'To build a house'],
        correctIndex: 0,
        explanation:
          'Work was not a punishment — it was given to people from the very start. God put the man in the garden to tend it and keep it.',
      },
      {
        type: 'choice',
        question: 'What did Adam call the person God brought to him?',
        choices: ['Woman', 'Eve', 'A helper fit for him', 'The mother of all the living'],
        correctIndex: 0,
        explanation:
          'Adam said, "This is now bone of my bones and flesh of my flesh," and called her woman, because she was taken out of man.',
      },
    ],
  },
  {
    book: 1,
    chapter: 3,
    summary:
      'This is the story of the first time people broke God’s word. The serpent comes to the woman and asks, "Did God really say you must not eat?" Then it tempts her: "You will not die — you will become like God." The woman and the man ate the fruit, and at once they knew shame and hid. When God came looking, the man blamed the woman and the woman blamed the serpent. In the end the people were sent out of the garden. But God did not only punish them — He made clothes of skin and dressed them, and He promised that one day a descendant of the woman would crush the serpent’s head.',
    questions: [
      {
        type: 'choice',
        question: 'What did the serpent say to the woman?',
        choices: ['You will surely not die', 'The fruit tastes bad', 'Leave the garden', 'God is coming'],
        correctIndex: 0,
        explanation:
          'The serpent flatly contradicted what God had said. God said "you will die"; the serpent said "you will surely not die."',
      },
      {
        type: 'choice',
        question: 'What was the first thing the two did after eating the fruit?',
        choices: [
          'Thanked God',
          'Realised they were naked and covered themselves',
          'Left the garden',
          'Caught the serpent',
        ],
        correctIndex: 1,
        explanation:
          'Their eyes were opened, they knew they were naked, and they sewed fig leaves together to cover themselves. Then they hid from God.',
      },
      {
        type: 'choice',
        question: 'What did Adam answer when God asked, "Where are you?"',
        choices: ['I was afraid, so I hid', 'I have done wrong', 'Here I am', 'He said nothing'],
        correctIndex: 0,
        explanation:
          'Adam said he was naked and afraid, so he hid. Then he immediately shifted the blame: "The woman you gave me handed it to me, and I ate."',
      },
      {
        type: 'choice',
        question: 'Whom did Adam blame for eating the fruit?',
        choices: ['The woman', 'The snake', 'God', 'The ground'],
        correctIndex: 0,
        explanation:
          'Adam blamed the woman and the woman blamed the serpent. Neither owned the wrong; each passed it on.',
      },
      {
        type: 'choice',
        question: 'What did God do after sending the two out of the garden?',
        choices: [
          'Made clothes of skin and dressed them',
          'Destroyed the garden',
          'Killed the serpent',
          'Sent rain',
        ],
        correctIndex: 0,
        explanation:
          'God made garments of skin for them and clothed them. Even while punishing, His care for them shows.',
      },
      {
        type: 'choice',
        question: 'What did God say to the serpent about the woman’s descendant?',
        choices: [
          'He will crush your head',
          'He will serve you',
          'He will disappear',
          'He will become a serpent',
        ],
        correctIndex: 0,
        explanation:
          '"He shall bruise your head, and you shall bruise his heel." Many read this as the first promise of rescue in the whole Bible.',
      },
      {
        type: 'choice',
        question: 'What name did Adam give his wife?',
        choices: ['Eve', 'Sarah', 'Rebekah', 'Miriam'],
        correctIndex: 0,
        explanation: 'He called her Eve, because she would be the mother of all the living.',
      },
    ],
  },
  {
    book: 1,
    chapter: 4,
    summary:
      'Two sons are born to Adam and Eve. The older, Cain, farms the ground; the younger, Abel, keeps sheep. Both bring an offering to God, and God accepts Abel’s but not Cain’s. To the angry Cain God gives a warning: "Sin is crouching at the door — you must rule over it." But Cain takes Abel out to the field and kills him. When God asks, "Where is your brother?" Cain denies knowing. Cain becomes a wanderer, yet God puts a mark on him so that no one will kill him.',
    questions: [
      {
        type: 'choice',
        question: 'What work did Cain and Abel each do?',
        choices: [
          'Cain farmed, Abel kept sheep',
          'Cain kept sheep, Abel farmed',
          'Both farmed',
          'Both fished',
        ],
        correctIndex: 0,
        explanation: 'Cain worked the soil; Abel was a shepherd who kept flocks.',
      },
      {
        type: 'choice',
        question: 'What warning did God give Cain?',
        choices: [
          'Sin is crouching at the door — rule over it',
          'Leave your brother',
          'Bring a bigger offering',
          'Leave this land',
        ],
        correctIndex: 0,
        explanation:
          'God warned Cain beforehand, while he was angry and his face had fallen. Sin was crouching at the door, and he was to master it.',
      },
      {
        type: 'choice',
        question: 'What did Cain answer when God asked, "Where is your brother Abel?"',
        choices: [
          'I do not know. Am I my brother’s keeper?',
          'He is in the field',
          'I am sorry',
          'He said nothing',
        ],
        correctIndex: 0,
        explanation:
          'Cain not only denied it — he answered back. It is the same refusal to own the wrong that Adam showed in chapter 3.',
      },
      {
        type: 'choice',
        question: 'What was the name of the brother Cain killed?',
        choices: ['Abel', 'Seth', 'Cain', 'Enoch'],
        correctIndex: 0,
        explanation: 'Cain struck down his brother Abel in the field. It is the first murder in the Bible.',
      },
      {
        type: 'choice',
        question: 'Why did God put a mark on Cain?',
        choices: [
          'So that no one who found him would kill him',
          'To honour Cain',
          'So his crops would grow well',
          'So he would not lose his way',
        ],
        correctIndex: 0,
        explanation:
          'Cain said he was afraid whoever found him would kill him, and God gave him a mark so no one would. Even in punishing, God guarded his life.',
      },
      {
        type: 'choice',
        question: 'What was the name of the son Adam and Eve had in place of Abel?',
        choices: ['Seth', 'Enoch', 'Lamech', 'Noah'],
        correctIndex: 0,
        explanation: 'Eve said, "God has granted me another child in place of Abel," and named him Seth.',
      },
      {
        type: 'choice',
        question: 'What was the name of the land where Cain lived away from God?',
        choices: ['Nod', 'Haran', 'Goshen', 'Uz'],
        correctIndex: 0,
        explanation:
          'Cain went out from the presence of the LORD and lived in the land of Nod, east of Eden.',
      },
    ],
  },
  {
    book: 1,
    chapter: 5,
    summary:
      'This is the family line running from Adam to Noah. Names and ages follow one after another, and two things are worth noticing. First, the words "and he died" keep coming back. It shows how death has passed down through the generations since people sinned. Second, one man is different — only Enoch. He walked with God, and instead of dying, God took him. The longest life belongs to Methuselah, who lived 969 years. The list stops with Noah and his three sons, and carries straight on into the next chapter.',
    questions: [
      {
        type: 'choice',
        question: 'Who in this family line did not die, but was taken by God?',
        choices: ['Enoch', 'Methuselah', 'Lamech', 'Seth'],
        correctIndex: 0,
        explanation:
          '"Enoch walked with God, and he was not, for God took him." He is the only one in the list without "and he died."',
      },
      {
        type: 'choice',
        question: 'Who lived the longest of anyone in the Bible?',
        choices: ['Methuselah', 'Adam', 'Noah', 'Enoch'],
        correctIndex: 0,
        explanation: 'Methuselah lived 969 years and then died.',
      },
      {
        type: 'choice',
        question: 'Which words are repeated over and over in this family line?',
        choices: ['And he died', 'And he rejoiced', 'And he fought', 'And he left'],
        correctIndex: 0,
        explanation:
          'After each name comes "he lived so many years, and he died." Plainly and without comment, it shows how death followed everyone once sin came in.',
      },
      {
        type: 'choice',
        question: 'What does the Bible say twice about Enoch?',
        choices: ['He walked with God', 'He was the richest', 'He was the strongest', 'He lived the longest'],
        correctIndex: 0,
        explanation:
          'Twice it says Enoch walked with God for 300 years. How he lived matters more here than how long.',
      },
      {
        type: 'choice',
        question: 'Who is the last person named in this family line?',
        choices: ['Noah', 'Enoch', 'Lamech', 'Seth'],
        correctIndex: 0,
        explanation: 'The list ends with Noah and his three sons, Shem, Ham and Japheth.',
      },
      {
        type: 'choice',
        question: 'Who were Noah’s three sons?',
        choices: [
          'Shem, Ham and Japheth',
          'Cain, Abel and Seth',
          'Enoch, Lamech and Methuselah',
          'Abram, Nahor and Haran',
        ],
        correctIndex: 0,
        explanation: 'After Noah was 500 years old he became the father of Shem, Ham and Japheth.',
      },
      {
        type: 'choice',
        question: 'With whom does this family line begin?',
        choices: ['Adam', 'Noah', 'Cain', 'Enoch'],
        correctIndex: 0,
        explanation:
          'It opens, "This is the book of the generations of Adam." It pauses to say again that when God made people, He made them in His own likeness.',
      },
    ],
  },
  {
    book: 1,
    chapter: 6,
    summary:
      'As people grow many on the earth, so does their evil. In God’s sight every thought people had was only evil. God is grieved, and says He is sorry He made them. But one man was different — Noah. He found favour with God and walked with Him. God tells Noah to build a great boat, giving him the exact length, width and height, and telling him to bring his family and the animals aboard. Noah did everything just as God commanded him.',
    questions: [
      {
        type: 'choice',
        question: 'How were the people of that time in God’s sight?',
        choices: [
          'Every plan their hearts made was always evil',
          'They helped one another',
          'They served God well',
          'They had done nothing wrong',
        ],
        correctIndex: 0,
        explanation:
          'It says human wickedness filled the earth, and every plan the heart made was only evil all the time.',
      },
      {
        type: 'choice',
        question: 'What does the Bible say about Noah?',
        choices: [
          'He found favour with God and walked with Him',
          'He was the richest',
          'He was a king',
          'He was a shipbuilder by trade',
        ],
        correctIndex: 0,
        explanation:
          'Noah was righteous and blameless in his time, and he walked with God — the same words used of Enoch in chapter 5.',
      },
      {
        type: 'choice',
        question: 'What did God tell Noah to build?',
        choices: ['An ark', 'An altar', 'A city', 'A tower'],
        correctIndex: 0,
        explanation: 'God told him to make an ark of gopher wood and cover it with pitch inside and out.',
      },
      {
        type: 'choice',
        question: 'What did God command about the animals for the ark?',
        choices: [
          'Bring every living creature, a male and a female of each',
          'Bring only the large animals',
          'Bring none at all',
          'Bring only birds',
        ],
        correctIndex: 0,
        explanation:
          'He was to bring every living creature into the ark, male and female, to keep them alive.',
      },
      {
        type: 'choice',
        question: 'Who was to go into the ark with Noah?',
        choices: [
          'His wife, his three sons and their wives',
          'Noah alone',
          'The whole village',
          'Only Noah and his wife',
        ],
        correctIndex: 0,
        explanation: 'Noah, his wife, his three sons and their three wives — eight people in all.',
      },
      {
        type: 'choice',
        question: 'What does the last sentence of this chapter say Noah did?',
        choices: [
          'He did everything God commanded him',
          'He did it after asking why',
          'He did it after talking it over with his family',
          'He did it after putting it off for a few days',
        ],
        correctIndex: 0,
        explanation:
          '"Noah did this; he did all that God commanded him." No explaining, no arguing — simply doing it. That is who Noah was.',
      },
      {
        type: 'choice',
        question: 'What does the Bible say God felt about having made people?',
        choices: [
          'He was grieved and His heart was troubled',
          'He was glad',
          'He said nothing',
          'He boasted',
        ],
        correctIndex: 0,
        explanation:
          'It says God was sorry He had made people on the earth, and His heart was deeply troubled. The judgement came out of pain, not rage.',
      },
    ],
  },
  {
    book: 1,
    chapter: 7,
    summary:
      'At last the flood begins. God tells Noah to go into the ark with his family. He is to take clean animals seven pairs at a time and the others a pair at a time. In the year Noah turned 600, the springs of the great deep burst open and the windows of heaven opened, and rain poured down for forty days. The water rose until it covered the highest mountains, and every living thing outside the ark was cut off. In this scene the Bible makes one thing plain — it was God who shut the door of the ark.',
    questions: [
      {
        type: 'choice',
        question: 'How many days did the rain fall?',
        choices: ['Forty days', 'Seven days', 'A hundred and fifty days', 'A year'],
        correctIndex: 0,
        explanation: 'Rain fell on the earth for forty days and forty nights.',
      },
      {
        type: 'choice',
        question: 'Who shut the door of the ark?',
        choices: ['God', 'Noah', 'Noah’s sons', 'No one shut it'],
        correctIndex: 0,
        explanation:
          '"And the LORD shut him in." That it was God, and not a person, who closed the door is the heart of this scene.',
      },
      {
        type: 'choice',
        question: 'How old was Noah when he entered the ark?',
        choices: ['600 years old', '500 years old', '700 years old', '900 years old'],
        correctIndex: 0,
        explanation:
          'The flood began in the six hundredth year of Noah’s life, on the seventeenth day of the second month.',
      },
      {
        type: 'choice',
        question: 'Where did the flood water come from?',
        choices: [
          'The springs of the great deep burst open and the windows of heaven opened',
          'From the sea only',
          'From a river overflowing',
          'From melting snow',
        ],
        correctIndex: 0,
        explanation:
          'Water welled up from below the ground and poured down from the sky. It came from above and below at once.',
      },
      {
        type: 'choice',
        question: 'How many pairs of clean animals was he to take?',
        choices: ['Seven pairs', 'One pair', 'Two pairs', 'Ten pairs'],
        correctIndex: 0,
        explanation:
          'Clean animals were to be taken seven pairs at a time, and animals that were not clean, one pair at a time.',
      },
      {
        type: 'choice',
        question: 'How many people went into the ark?',
        choices: ['Eight', 'Four', 'Six', 'Twelve'],
        correctIndex: 0,
        explanation: 'Noah and his wife, his three sons and their three wives — eight people in all.',
      },
      {
        type: 'choice',
        question: 'How long did the water flood the earth?',
        choices: ['150 days', '40 days', 'One year', 'Ten days'],
        correctIndex: 0,
        explanation:
          'The rain fell for forty days, but the water flooded the earth for 150 days. The water did not drain away the moment the rain stopped.',
      },
    ],
  },
  {
    book: 1,
    chapter: 8,
    summary:
      'This chapter opens with the words, "God remembered Noah." God sent a wind, the water began to go down, and the ark came to rest on the mountains of Ararat. Noah sent out a raven, and then a dove. The first dove found nowhere to land and came back; the one sent seven days later returned with a fresh olive leaf. The dove sent seven days after that did not return — the water had dried up. When Noah came out of the ark, he built an altar and offered a sacrifice, and God said He would never again curse the ground in this way.',
    questions: [
      {
        type: 'choice',
        question: 'How does this chapter begin?',
        choices: [
          'God remembered Noah',
          'The rain stopped',
          'Noah came out of the boat',
          'The land dried up',
        ],
        correctIndex: 0,
        explanation:
          '"God remembered Noah and all the wild animals and livestock that were with him in the ark." That God remembered comes before the water going down.',
      },
      {
        type: 'choice',
        question: 'On what mountain did the ark come to rest?',
        choices: ['Mount Ararat', 'Mount Sinai', 'Mount Moriah', 'Mount Horeb'],
        correctIndex: 0,
        explanation:
          'On the seventeenth day of the seventh month the ark came to rest on the mountains of Ararat.',
      },
      {
        type: 'choice',
        question: 'What did the second dove bring back?',
        choices: ['A fresh olive leaf', 'A branch', 'Grass', 'Nothing'],
        correctIndex: 0,
        explanation:
          'The dove came back with a freshly picked olive leaf. By that Noah knew the water had gone down.',
      },
      {
        type: 'choice',
        question: 'Which bird did Noah send out first?',
        choices: ['A raven', 'A dove', 'An eagle', 'A sparrow'],
        correctIndex: 0,
        explanation: 'Noah sent out a raven first, and after that a dove.',
      },
      {
        type: 'choice',
        question: 'What was the first thing Noah did when he came out onto the land?',
        choices: [
          'Built an altar and offered a sacrifice',
          'Built a house',
          'Started farming',
          'Founded a village',
        ],
        correctIndex: 0,
        explanation:
          'Noah built an altar to the LORD and offered burnt offerings from the clean animals. The first thing he did after surviving was worship.',
      },
      {
        type: 'choice',
        question: 'What did God promise in His heart?',
        choices: [
          'Never again to curse the ground because of people',
          'Never to send rain again',
          'Never to make people again',
          'To have another ark built',
        ],
        correctIndex: 0,
        explanation:
          'God said He would never again curse the ground because of people, and never again destroy all living creatures.',
      },
      {
        type: 'choice',
        question: 'Which of these did God say would "never cease"?',
        choices: ['Seedtime and harvest', 'The sun and the moon', 'Heaven and earth', 'Light and darkness'],
        correctIndex: 0,
        explanation:
          'God said that as long as the earth endures, seedtime and harvest, cold and heat, summer and winter, day and night will never cease.',
      },
    ],
  },
  {
    book: 1,
    chapter: 9,
    summary:
      'The flood is over, and God promises Noah a fresh start. He tells people again to "be fruitful and multiply," and He makes clear that human life must not be treated lightly, because people were made in the image of God. As a sign of His promise never again to destroy the world with water, He gives the rainbow. But the story does not end beautifully. Noah drinks wine, becomes drunk, and lies uncovered; his son Ham sees it and tells the others outside. Shem and Japheth walk in backwards and cover their father.',
    questions: [
      {
        type: 'choice',
        question: 'What did God give as the sign of His promise never again to destroy the earth with water?',
        choices: ['A rainbow', 'An altar', 'A pillar of cloud', 'A stone pillar'],
        correctIndex: 0,
        explanation:
          'God set a rainbow in the clouds as the sign of the covenant. He said that whenever He sees it, He remembers that promise.',
      },
      {
        type: 'choice',
        question: 'Why did God say human blood must not be shed?',
        choices: [
          'Because God made people in His own image',
          'Because there were few people',
          'Because blood is precious',
          'Because it causes fights',
        ],
        correctIndex: 0,
        explanation:
          'The Bible grounds the worth of a human life in this: people are made in the image of God.',
      },
      {
        type: 'choice',
        question: 'What did Noah do after the flood that went wrong?',
        choices: [
          'He drank wine and became drunk',
          'He built another boat',
          'He drove out a son',
          'He stopped offering sacrifices',
        ],
        correctIndex: 0,
        explanation:
          'Noah began to farm and planted a vineyard. He drank the wine, became drunk, and lay uncovered inside his tent.',
      },
      {
        type: 'choice',
        question: 'What did Shem and Japheth do for their father?',
        choices: [
          'Walked in backwards and covered him with a garment',
          'Told the others outside',
          'Woke him up',
          'Left the tent',
        ],
        correctIndex: 0,
        explanation:
          'They laid a garment on their shoulders, walked in backwards and covered their father, turning their faces away so they would not see him.',
      },
      {
        type: 'choice',
        question: 'What blessing did God give again to Noah and his sons?',
        choices: [
          'Be fruitful and multiply and fill the earth',
          'Settle together in one place',
          'Build a boat',
          'Go up into the mountains',
        ],
        correctIndex: 0,
        explanation:
          'The words God gave people in Genesis 1 are given again after the flood. He was letting them begin anew.',
      },
      {
        type: 'choice',
        question: 'Which son saw his father uncovered and told the others outside?',
        choices: ['Ham', 'Shem', 'Japheth', 'Canaan'],
        correctIndex: 0,
        explanation:
          'Ham, the father of Canaan, saw his father uncovered and went out and told his two brothers.',
      },
      {
        type: 'choice',
        question: 'What did God say He would remember when He sees the rainbow?',
        choices: ['The everlasting covenant', 'People’s sin', 'The flood', 'The ark'],
        correctIndex: 0,
        explanation:
          'He said He would see the rainbow and remember the everlasting covenant between God and every living creature.',
      },
    ],
  },
  {
    book: 1,
    chapter: 10,
    summary:
      'This is the record of how the descendants of Noah’s three sons — Shem, Ham and Japheth — spread across the whole earth. Many names appear, but the point is one: all the nations of today’s world came from a single family. Japheth’s line spread mostly north and along the coasts, Ham’s south into Africa and toward Canaan, and Shem’s to the east. Among Ham’s descendants comes Nimrod, a mighty hunter, and one of the cities he founded is Babel — which leads straight into the tower of Babel in the next chapter.',
    questions: [
      {
        type: 'choice',
        question: 'Whose descendants does this record list?',
        choices: ['Noah’s three sons, Shem, Ham and Japheth', 'Adam and Eve', 'Abraham', 'Cain'],
        correctIndex: 0,
        explanation:
          'It is the record of Noah’s sons Shem, Ham and Japheth, and of the sons born to them after the flood.',
      },
      {
        type: 'choice',
        question: 'What was the name of the mighty hunter called "the first mighty man on earth"?',
        choices: ['Nimrod', 'Cush', 'Mizraim', 'Canaan'],
        correctIndex: 0,
        explanation:
          'Nimrod, Ham’s grandson, is called the first mighty man on earth and a mighty hunter before the LORD.',
      },
      {
        type: 'choice',
        question: 'Which was one of the cities where Nimrod’s kingdom began?',
        choices: ['Babel', 'Jerusalem', 'Hebron', 'Bethlehem'],
        correctIndex: 0,
        explanation:
          'His kingdom began at Babel, Erech and Akkad in the land of Shinar. It connects to the tower of Babel in the next chapter.',
      },
      {
        type: 'choice',
        question: 'What is this record meant to show?',
        choices: [
          'That all the nations came from one family',
          'Who was the strongest',
          'Who lived the longest',
          'Who was the richest',
        ],
        correctIndex: 0,
        explanation:
          'It closes by saying that from these the nations spread out over the earth. The peoples of the world share one root.',
      },
      {
        type: 'choice',
        question: 'Whose son was Canaan?',
        choices: ['Ham', 'Shem', 'Japheth', 'Noah'],
        correctIndex: 0,
        explanation:
          'Canaan was a son of Ham, and his name is later given to the land Israel comes to live in.',
      },
      {
        type: 'choice',
        question: 'What were the names of Noah’s three sons?',
        choices: [
          'Shem, Ham and Japheth',
          'Cain, Abel and Seth',
          'Shem, Ham and Terah',
          'Japheth, Enoch and Lamech',
        ],
        correctIndex: 0,
        explanation: 'Shem, Ham and Japheth. From these three the nations of the earth spread out.',
      },
      {
        type: 'choice',
        question: 'By what is the record said to divide the people it lists?',
        choices: [
          'Their languages, clans and nations',
          'Their height and weight',
          'Their wealth',
          'Their age',
        ],
        correctIndex: 0,
        explanation:
          'It says again and again that they were divided by language, by clan and by nation. Chapter 11 tells why the languages divided.',
      },
    ],
  },
  {
    book: 1,
    chapter: 11,
    summary:
      'At a time when the whole earth had one language, people gathered on the plain of Shinar and began to build a city and a tower. Their purpose is stated plainly — "let us make a name for ourselves, so we are not scattered." God had told them to spread out over the earth; instead they tried to bundle together in one place. God came down and confused their language, and when they could no longer understand each other they scattered. That city is called Babel. The rest of the chapter is the family line from Shem to Terah, and Terah’s son Abram appears.',
    questions: [
      {
        type: 'choice',
        question: 'Why did the people build the tower?',
        choices: [
          'To make a name for themselves and not be scattered',
          'To worship God',
          'To escape a flood',
          'To keep out enemies',
        ],
        correctIndex: 0,
        explanation:
          'They said, "Let us make a name for ourselves, so we are not scattered over the face of the whole earth" — the exact opposite of what God had told them.',
      },
      {
        type: 'choice',
        question: 'How did God scatter them?',
        choices: [
          'He confused their language',
          'He knocked down the tower',
          'He sent rain',
          'He split the ground',
        ],
        correctIndex: 0,
        explanation:
          'God confused their language so they could not understand one another. They stopped the work and scattered.',
      },
      {
        type: 'choice',
        question: 'What was the name of the city they were building?',
        choices: ['Babel', 'Nineveh', 'Sodom', 'Haran'],
        correctIndex: 0,
        explanation: 'It was called Babel, because there the LORD confused the language of the whole earth.',
      },
      {
        type: 'choice',
        question: 'What materials did they use to build the tower?',
        choices: ['Brick and tar', 'Stone and wood', 'Clay and grass', 'Iron and copper'],
        correctIndex: 0,
        explanation:
          'The text carefully notes they used brick instead of stone and tar instead of mortar — a sign of how far their skill had come.',
      },
      {
        type: 'choice',
        question: 'Who is the son of Terah named at the end of this chapter?',
        choices: ['Abram', 'Isaac', 'Jacob', 'Joseph'],
        correctIndex: 0,
        explanation:
          'Terah was the father of Abram, Nahor and Haran. Abram is called by God in the next chapter.',
      },
      {
        type: 'choice',
        question: 'What was the name of Abram’s wife?',
        choices: ['Sarai', 'Milcah', 'Hagar', 'Rebekah'],
        correctIndex: 0,
        explanation:
          'Abram’s wife was named Sarai. This chapter notes ahead of time that Sarai had no children.',
      },
      {
        type: 'choice',
        question: 'What was the language of the whole earth before the tower was built?',
        choices: ['It was one', 'There were many', 'There was none', 'Only writing existed'],
        correctIndex: 0,
        explanation:
          'It begins, "Now the whole earth had one language and the same words." That is why they could do anything together.',
      },
    ],
  },
  {
    book: 1,
    chapter: 12,
    summary:
      'God calls Abram. "Leave your country, your relatives and your father’s house, and go to the land I will show you." He was called without even being told where he was going. In its place God gives a great promise — Abram will become a great nation, he will be blessed, and through him all the families of the earth will be blessed. Abram set out at seventy-five. But when famine came to Canaan he went down to Egypt, and there he passed off his wife Sarai as his sister. Even the man called a man of faith wavered when he was afraid.',
    questions: [
      {
        type: 'choice',
        question: 'What was God’s first command to Abram?',
        choices: [
          'Leave your country, your relatives and your father’s house',
          'Build an altar',
          'Have a son',
          'Go to Egypt',
        ],
        correctIndex: 0,
        explanation: 'God told Abram to leave everything familiar and go to the land God would show him.',
      },
      {
        type: 'choice',
        question: 'How old was Abram when he left Haran?',
        choices: ['Seventy-five', 'Sixty', 'Eighty', 'Ninety-nine'],
        correctIndex: 0,
        explanation: 'Abram was seventy-five years old when he left Haran.',
      },
      {
        type: 'choice',
        question: 'Which of these was NOT part of God’s promise to Abram?',
        choices: [
          'All the families of the earth will be blessed through you',
          'I will make you into a great nation',
          'I will make your name great',
          'I will make you a king',
        ],
        correctIndex: 3,
        explanation:
          'God promised a great nation, blessing, a great name, and blessing for all families through Abram. Being made a king is not among these words.',
      },
      {
        type: 'choice',
        question: 'Why did Abram go down to Egypt?',
        choices: [
          'Because there was a famine in the land',
          'Because war broke out',
          'Because God commanded it',
          'To trade',
        ],
        correctIndex: 0,
        explanation: 'The famine in Canaan was severe, so Abram went down to stay in Egypt for a while.',
      },
      {
        type: 'choice',
        question: 'What did Abram say about his wife Sarai in Egypt?',
        choices: ['Say you are my sister', 'Say you are my wife', 'Say nothing at all', 'Leave'],
        correctIndex: 0,
        explanation:
          'Fearing he would be killed, Abram had Sarai say she was his sister. Even a man who had received God’s promise wavered when afraid.',
      },
      {
        type: 'choice',
        question: 'What did Abram do for God when he came into Canaan?',
        choices: ['He built an altar', 'He built a city', 'He dug a well', 'He bought a field'],
        correctIndex: 0,
        explanation:
          'Near Shechem and Bethel Abram built an altar to the LORD and called on the name of the LORD.',
      },
      {
        type: 'choice',
        question: 'What was the name of the nephew who left with Abram?',
        choices: ['Lot', 'Nahor', 'Haran', 'Isaac'],
        correctIndex: 0,
        explanation: 'Abram took his wife Sarai and his nephew Lot with him when he left Haran.',
      },
    ],
  },
];
