/**
 * Bible Reading Helper content (English) — Genesis 30–40
 *
 * Mirrors scripts/content/genesis-30-40.js chapter for chapter, question for
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
    chapter: 30,
    summary:
      'This is the story of Jacob’s two wives, Leah and Rachel, fighting over children. Rachel, having none, sends in her servant Bilhah, and Leah sends in her servant Zilpah. With each son born, the two women pour their own hearts into the names. At last God remembers Rachel, and Joseph is born. The second half is the quarrel over wages between Jacob and his uncle Laban. Laban keeps changing the terms and cheating him, yet Jacob’s flocks only grow larger.',
    questions: [
      {
        type: 'choice',
        question: 'Which son did Rachel finally have after a long time without children?',
        choices: ['Joseph', 'Judah', 'Dan', 'Levi'],
        correctIndex: 0,
        explanation:
          '"God remembered Rachel," and Joseph was born. Rachel said, "May the LORD add to me another son."',
      },
      {
        type: 'choice',
        question: 'What were Leah and Rachel fighting over?',
        choices: ['Bearing children', 'Property', 'Where to live', 'Livestock'],
        correctIndex: 0,
        explanation:
          'Two wives of one husband competed over sons. Every single name carries their hurt and their longing.',
      },
      {
        type: 'choice',
        question: 'What was the name of Rachel’s servant?',
        choices: ['Bilhah', 'Zilpah', 'Dinah', 'Leah'],
        correctIndex: 0,
        explanation: 'Rachel gave her servant Bilhah to Jacob, and Dan and Naphtali were born.',
      },
      {
        type: 'choice',
        question: 'What wages did Jacob ask Laban for?',
        choices: [
          'The speckled and spotted animals and the black sheep',
          'Silver and gold',
          'Land',
          'A house',
        ],
        correctIndex: 0,
        explanation:
          'Jacob asked only for the unusually marked animals as his share. At first glance it looked like a losing deal.',
      },
      {
        type: 'choice',
        question: 'How did Laban treat Jacob?',
        choices: [
          'He cheated him, changing his wages again and again',
          'He always dealt honestly',
          'He shared his property',
          'He took no interest at all',
        ],
        correctIndex: 0,
        explanation:
          'Laban kept changing the terms. Even so, the Bible sees Jacob’s growing flocks as God’s doing.',
      },
      {
        type: 'choice',
        question: 'Which of Leah’s sons later became the ancestor of the tribe of Judah?',
        choices: ['Judah', 'Reuben', 'Simeon', 'Levi'],
        correctIndex: 0,
        explanation: 'Judah was born back in chapter 29, and from this family come David and, later, Jesus.',
      },
      {
        type: 'choice',
        question: 'How did Jacob stand at the end of this chapter?',
        choices: [
          'He increased greatly, with many flocks and servants',
          'He lost everything he had',
          'He went back home',
          'He fell ill',
        ],
        correctIndex: 0,
        explanation:
          'It closes with, "the man increased greatly and had large flocks, female and male servants, camels and donkeys."',
      },
    ],
  },
  {
    book: 1,
    chapter: 31,
    summary:
      'Jacob leaves Laban’s house. Laban’s sons are jealous and Laban’s face is no longer what it was, so God tells Jacob to go back to his homeland. Jacob talks it over with his two wives and leaves while Laban is away shearing sheep. Rachel secretly takes her father’s household idols. Laban finds out, chases them down and confronts Jacob, but never finds the idols. In the end the two men pile up stones and promise not to harm each other. That place is called Mizpah.',
    questions: [
      {
        type: 'choice',
        question: 'What made Jacob decide to leave?',
        choices: [
          'God told him to go back to his homeland',
          'His flocks were shrinking',
          'His wives wanted it',
          'A famine came',
        ],
        correctIndex: 0,
        explanation:
          'The word came: "Return to the land of your fathers, and I will be with you." The change in Laban’s attitude played its part too.',
      },
      {
        type: 'choice',
        question: 'What did Rachel secretly take from her father’s house?',
        choices: ['The household idols', 'Silver and gold', 'A flock of sheep', 'Clothing'],
        correctIndex: 0,
        explanation:
          'Rachel stole her father’s household idols. That is what made Laban chase them all the way.',
      },
      {
        type: 'choice',
        question: 'What was one of the things Laban accused Jacob of?',
        choices: [
          'Why did you steal my gods?',
          'Did you kill my sheep?',
          'Did you burn my house?',
          'Did you take my son?',
        ],
        correctIndex: 0,
        explanation:
          'Laban charged him with taking his daughters and stealing his gods. Jacob, not knowing they had been taken, insisted he was innocent.',
      },
      {
        type: 'choice',
        question: 'Where did Rachel hide the idols?',
        choices: ['Under the camel’s saddle', 'In her clothes', 'In the ground', 'Up a tree'],
        correctIndex: 0,
        explanation: 'Rachel put them in the camel’s saddle and sat on them, so Laban could not find them.',
      },
      {
        type: 'choice',
        question:
          'What was the name of the place where Jacob and Laban piled up stones and made their promise?',
        choices: ['Mizpah', 'Galeed', 'Bethel', 'Mahanaim'],
        correctIndex: 0,
        explanation:
          'They called it Mizpah, saying, "May the LORD watch between you and me when we are out of one another’s sight."',
      },
      {
        type: 'choice',
        question: 'How many years did Jacob work in Laban’s house?',
        choices: ['Twenty years', 'Ten years', 'Seven years', 'Thirty years'],
        correctIndex: 0,
        explanation:
          'Fourteen years for his two wives and six for the flocks — twenty in all, as Jacob says himself.',
      },
      {
        type: 'choice',
        question: 'What did Jacob say was the reason his wealth had grown?',
        choices: [
          'Because God had been with him',
          'Because of his own cleverness',
          'Because of Laban’s kindness',
          'Because he was lucky',
        ],
        correctIndex: 0,
        explanation:
          'Jacob said the God of his father had been with him, and that God had given Laban’s livestock to him.',
      },
    ],
  },
  {
    book: 1,
    chapter: 32,
    summary:
      'On the way home Jacob has to meet his brother Esau — the brother whose blessing he stole twenty years ago before running away. When he hears Esau is coming with four hundred men, Jacob is terrified. He divides his company in two, sends gifts on ahead, and clings to God in prayer. That night, at the ford of the Jabbok, he wrestles with a man until daybreak. Even with his hip put out of joint, Jacob holds on: "I will not let you go unless you bless me." That night Jacob is given a new name, Israel.',
    questions: [
      {
        type: 'choice',
        question: 'Why was Jacob afraid?',
        choices: [
          'Because he heard his brother Esau was coming with four hundred men',
          'Because Laban was chasing him again',
          'Because of a famine',
          'Because he had lost his way',
        ],
        correctIndex: 0,
        explanation:
          'Twenty years earlier he had stolen his brother’s blessing, so news that Esau was coming with men left him greatly afraid and distressed.',
      },
      {
        type: 'choice',
        question: 'What was the name of the river where Jacob wrestled all night?',
        choices: ['The Jabbok', 'The Jordan', 'The Kishon', 'The Gerar'],
        correctIndex: 0,
        explanation: 'Jacob was left alone at the ford of the Jabbok and wrestled with a man until daybreak.',
      },
      {
        type: 'choice',
        question: 'What happened to Jacob’s body during the wrestling?',
        choices: ['His hip was put out of joint', 'His arm was broken', 'He went blind', 'Nothing happened'],
        correctIndex: 0,
        explanation:
          'The man touched Jacob’s hip socket and put it out of joint, and afterwards Jacob limped.',
      },
      {
        type: 'choice',
        question: 'What new name was Jacob given?',
        choices: ['Israel', 'Abraham', 'Edom', 'Peniel'],
        correctIndex: 0,
        explanation:
          '"Your name shall no longer be called Jacob, but Israel." It is explained as having striven with God and prevailed.',
      },
      {
        type: 'choice',
        question: 'What did Jacob say as he wrestled?',
        choices: [
          'I will not let you go unless you bless me',
          'Please let me go',
          'I have no strength',
          'Who are you?',
        ],
        correctIndex: 0,
        explanation: 'Even when told to let go because day was breaking, Jacob held on until he was blessed.',
      },
      {
        type: 'choice',
        question: 'What did Jacob name that place?',
        choices: ['Peniel', 'Bethel', 'Mizpah', 'Mahanaim'],
        correctIndex: 0,
        explanation:
          'He called it Peniel, saying, "I have seen God face to face, and yet my life has been delivered."',
      },
      {
        type: 'choice',
        question: 'What did Jacob send ahead to his brother?',
        choices: ['A large gift of livestock', 'A letter', 'Nothing at all', 'Soldiers'],
        correctIndex: 0,
        explanation:
          'Jacob sent droves of goats, sheep, camels, cattle and donkeys ahead of him, hoping to soften his brother’s heart.',
      },
    ],
  },
  {
    book: 1,
    chapter: 33,
    summary:
      'The meeting Jacob dreaded turns out very differently. He arranges his family, goes ahead himself and bows to the ground seven times as he approaches his brother — and Esau runs to him, throws his arms round his neck, kisses him, and they weep together. Esau refuses the gift at first, and takes it only when Jacob presses him. Jacob asks to travel at the pace of the children and the young animals rather than keeping up with Esau, and by way of Succoth he comes to Shechem, where he buys land and builds an altar.',
    questions: [
      {
        type: 'choice',
        question: 'How did Esau receive Jacob?',
        choices: [
          'He ran to him, embraced and kissed him, and they wept together',
          'He came after him with a sword',
          'He pretended not to see him',
          'He demanded money',
        ],
        correctIndex: 0,
        explanation:
          'The scene Jacob feared most became the warmest scene of all. The two brothers fell on each other’s necks and wept.',
      },
      {
        type: 'choice',
        question: 'What did Jacob do as he came near his brother?',
        choices: ['He bowed to the ground seven times', 'He ran to him', 'He hid', 'He threw the gift down'],
        correctIndex: 0,
        explanation:
          'Jacob bowed to the ground seven times before his brother. He came in a posture of complete humility.',
      },
      {
        type: 'choice',
        question: 'How did Esau respond to the gift?',
        choices: [
          'He declined it, saying he had enough',
          'He asked for more',
          'He took it at once',
          'He was angry',
        ],
        correctIndex: 0,
        explanation:
          'Esau said, "I have enough, my brother; keep what you have." He accepted only when Jacob kept urging him.',
      },
      {
        type: 'choice',
        question:
          'What was the name of the place where Jacob built a house and shelters after parting from Esau?',
        choices: ['Succoth', 'Shechem', 'Bethel', 'Mahanaim'],
        correctIndex: 0,
        explanation: 'Jacob came to Succoth, built himself a house and made shelters for his livestock.',
      },
      {
        type: 'choice',
        question: 'What did Jacob do at Shechem?',
        choices: [
          'He bought a field and built an altar',
          'He built a city',
          'He fought a war',
          'He left straight away',
        ],
        correctIndex: 0,
        explanation:
          'He bought the field in front of the city of Shechem, built an altar there and called it El-Elohe-Israel.',
      },
      {
        type: 'choice',
        question: 'Why did Jacob not travel quickly with his brother?',
        choices: [
          'Because the children and the young animals could not stand it',
          'Because he disliked his brother',
          'Because he did not know the way',
          'Because the loads were heavy',
        ],
        correctIndex: 0,
        explanation:
          'Jacob said the children were frail and the nursing animals would all die if driven hard for even one day, so he would go slowly.',
      },
      {
        type: 'choice',
        question: 'What did Jacob name the altar he built at Shechem?',
        choices: ['El-Elohe-Israel', 'The LORD Will Provide', 'The LORD is my Banner', 'El-Bethel'],
        correctIndex: 0,
        explanation: 'The name means "God, the God of Israel."',
      },
    ],
  },
  {
    book: 1,
    chapter: 34,
    summary:
      'This is a hard chapter to read. Jacob’s daughter Dinah goes out to see the women of the land and is violated by Shechem. Shechem asks for her as his wife, and his father Hamor proposes that the two families live together and intermarry. Jacob’s sons pretend to agree, but set a condition: every male must be circumcised. On the third day, while the men of the town are still in pain, Simeon and Levi attack the city and kill every male. Jacob rebukes his sons, but this deed casts a shadow far into the future.',
    questions: [
      {
        type: 'choice',
        question: 'What was the name of Jacob’s daughter this happened to?',
        choices: ['Dinah', 'Rebekah', 'Rachel', 'Tamar'],
        correctIndex: 0,
        explanation: 'Dinah was the daughter Leah bore to Jacob.',
      },
      {
        type: 'choice',
        question: 'What condition did Jacob’s sons set?',
        choices: [
          'That every male in the town be circumcised',
          'That they pay a great sum of money',
          'That they leave the city',
          'That they hand over their land',
        ],
        correctIndex: 0,
        explanation:
          'The sons spoke deceitfully and made circumcision the condition. They meant to attack from the start.',
      },
      {
        type: 'choice',
        question: 'Which two sons of Jacob attacked the town?',
        choices: ['Simeon and Levi', 'Reuben and Judah', 'Dan and Naphtali', 'Joseph and Benjamin'],
        correctIndex: 0,
        explanation: 'Simeon and Levi, Dinah’s brothers, each took his sword and killed the men of the town.',
      },
      {
        type: 'choice',
        question: 'What did Jacob think of what they had done?',
        choices: [
          'He rebuked them for making him hated by the people of the land',
          'He praised them',
          'He said nothing',
          'He rejoiced with them',
        ],
        correctIndex: 0,
        explanation:
          'Jacob rebuked them for making him stink among the people of the land. He feared for his household, few as they were.',
      },
      {
        type: 'choice',
        question: 'What did the sons say back to Jacob?',
        choices: [
          'Should he treat our sister like a prostitute?',
          'We were wrong',
          'We will kill more',
          'We will leave',
        ],
        correctIndex: 0,
        explanation:
          'The sons answered by pointing to what their sister had suffered. Right and wrong do not fall neatly on one side here.',
      },
      {
        type: 'choice',
        question: 'What was the name of the man who asked for Dinah as his wife?',
        choices: ['Shechem', 'Hamor', 'Esau', 'Laban'],
        correctIndex: 0,
        explanation: 'He was Shechem, son of Hamor the Hivite. The town bore the same name.',
      },
      {
        type: 'choice',
        question: 'What did Jacob’s sons do in the town after the attack?',
        choices: [
          'They carried off the goods, the livestock and the people',
          'They took nothing',
          'They rebuilt the city',
          'They bought land',
        ],
        correctIndex: 0,
        explanation:
          'They took the sheep, cattle and donkeys, everything in the city and the field, and carried off the women and children as well.',
      },
    ],
  },
  {
    book: 1,
    chapter: 35,
    summary:
      'God tells Jacob to go up to Bethel — the place where he met God twenty years earlier, on the run. Jacob tells his household to get rid of their foreign gods and purify themselves, then goes up and builds an altar. God confirms the name Israel and the covenant again. But this chapter carries sorrow too. Deborah, Rebekah’s nurse, dies; Rachel dies giving birth to Benjamin and is buried beside the road to Bethlehem; and Isaac dies, with Esau and Jacob burying him together.',
    questions: [
      {
        type: 'choice',
        question: 'Where did God tell Jacob to go up?',
        choices: ['Bethel', 'Shechem', 'Hebron', 'Peniel'],
        correctIndex: 0,
        explanation:
          '"Arise, go up to Bethel and dwell there, and make an altar there." It was the very place he had met God while fleeing.',
      },
      {
        type: 'choice',
        question: 'What did Jacob tell his household to do before going up to Bethel?',
        choices: [
          'Put away their foreign gods, purify themselves and change their clothes',
          'Pack their bags',
          'Sell their livestock',
          'Nothing at all',
        ],
        correctIndex: 0,
        explanation:
          'Jacob gathered the foreign gods and buried them under an oak. He put things in order before going to God.',
      },
      {
        type: 'choice',
        question: 'What was the name of the son Rachel died giving birth to?',
        choices: ['Benjamin', 'Joseph', 'Dan', 'Naphtali'],
        correctIndex: 0,
        explanation:
          'As she was dying Rachel called him Ben-oni, "son of my sorrow," but his father called him Benjamin, "son of the right hand."',
      },
      {
        type: 'choice',
        question: 'Where was Rachel buried?',
        choices: ['On the road to Ephrath, that is, Bethlehem', 'Bethel', 'Hebron', 'Shechem'],
        correctIndex: 0,
        explanation:
          'Rachel was buried on the way to Ephrath (Bethlehem), and Jacob set up a pillar over her grave.',
      },
      {
        type: 'choice',
        question: 'What did God confirm to Jacob again in this chapter?',
        choices: [
          'The name Israel and the covenant',
          'Great wealth',
          'Reconciliation with his brother',
          'A long life',
        ],
        correctIndex: 0,
        explanation:
          'God said, "Your name shall be Israel," and carried on the promise of the land given to Abraham and Isaac.',
      },
      {
        type: 'choice',
        question: 'Which of Jacob’s parents died in this chapter?',
        choices: ['Isaac', 'Abraham', 'Laban', 'Esau'],
        correctIndex: 0,
        explanation: 'Isaac died at a hundred and eighty, and his sons Esau and Jacob buried him together.',
      },
      {
        type: 'choice',
        question: 'What name did Jacob give God at Bethel?',
        choices: ['El-Bethel', 'El-Elohe-Israel', 'The LORD Will Provide', 'El Shaddai'],
        correctIndex: 0,
        explanation:
          'He called the altar El-Bethel, because God had revealed Himself there when he was fleeing from his brother.',
      },
    ],
  },
  {
    book: 1,
    chapter: 36,
    summary:
      'This is the genealogy of Esau. Esau is Jacob’s brother and the ancestor of the Edomites. The names and places run on for a long while, but there are things worth noticing. One is that Esau and Jacob separated because their possessions and livestock were too many for them to live in one place. They were reconciled in chapter 33, yet they went different ways. Another is that Edom had kings long before Israel ever did. Genesis settles Esau’s line like this before returning to the line of the promise.',
    questions: [
      {
        type: 'choice',
        question: 'What is Esau’s other name?',
        choices: ['Edom', 'Seir', 'Israel', 'Ishmael'],
        correctIndex: 0,
        explanation: 'The chapter begins, "These are the generations of Esau (that is, Edom)."',
      },
      {
        type: 'choice',
        question: 'Why did Esau and Jacob live apart?',
        choices: [
          'Their possessions and livestock were too many for them to live in one place',
          'They quarrelled again',
          'God commanded it',
          'Because of a famine',
        ],
        correctIndex: 0,
        explanation:
          'Their property was too great for them to dwell together, and Esau went to the hill country of Seir.',
      },
      {
        type: 'choice',
        question: 'What is the name of the hill country Esau settled in?',
        choices: ['Mount Seir', 'Mount Sinai', 'Mount Carmel', 'Mount Ararat'],
        correctIndex: 0,
        explanation: 'Esau lived in the hill country of Seir and became the ancestor of the Edomites.',
      },
      {
        type: 'choice',
        question: 'What does this genealogy make a point of recording?',
        choices: [
          'The kings of Edom before any king reigned in Israel',
          'The songs of Edom',
          'The laws of Edom',
          'The temple of Edom',
        ],
        correctIndex: 0,
        explanation:
          'It says, "These are the kings who reigned in the land of Edom before any king reigned over the Israelites."',
      },
      {
        type: 'choice',
        question: 'Where did Esau’s wives come from?',
        choices: ['From Canaan and from Ishmael’s daughters', 'Egypt', 'Babylon', 'Aram'],
        correctIndex: 0,
        explanation:
          'Esau married Canaanite women and Basemath, daughter of Ishmael. His parents were not pleased with those marriages.',
      },
      {
        type: 'choice',
        question: 'Whose older brother was Esau?',
        choices: ['Jacob', 'Joseph', 'Isaac', 'Laban'],
        correctIndex: 0,
        explanation: 'Esau and Jacob were the twin sons of Isaac and Rebekah.',
      },
      {
        type: 'choice',
        question: 'Why does the Bible include this genealogy here?',
        choices: [
          'To settle Esau’s side of the story before moving on to Jacob’s',
          'To exalt Edom',
          'To record a war',
          'To list land prices',
        ],
        correctIndex: 0,
        explanation:
          'Genesis keeps clearing away the side branches before returning to the line of promise. The story of Joseph begins in the next chapter.',
      },
    ],
  },
  {
    book: 1,
    chapter: 37,
    summary:
      'The story of Joseph begins. Jacob loves Joseph, born in his old age, above the rest and makes him a richly ornamented coat, and his brothers hate him for it. Then Joseph tells them his dreams: their sheaves bowing to his sheaf, and the sun, moon and eleven stars bowing to him. The hatred grows. When their father sends Joseph to find them, the brothers throw him into a pit and sell him to passing traders for twenty pieces of silver. Then they dip the coat in goat’s blood and deceive their father.',
    questions: [
      {
        type: 'choice',
        question: 'What did Jacob make for Joseph?',
        choices: ['A richly ornamented coat', 'A gold ring', 'A staff', 'A sword'],
        correctIndex: 0,
        explanation:
          'Jacob loved Joseph more than his other sons and made him an ornamented coat, and his brothers hated him when they saw it.',
      },
      {
        type: 'choice',
        question: 'What was Joseph’s second dream?',
        choices: [
          'The sun, moon and eleven stars bowing down to him',
          'Sheaves of grain bowing down',
          'Falling into a pit',
          'Becoming a king',
        ],
        correctIndex: 0,
        explanation:
          'The first dream was of sheaves, the second of the sun, moon and eleven stars. It was bold enough that even his father rebuked him.',
      },
      {
        type: 'choice',
        question: 'For how many pieces of silver did the brothers sell Joseph?',
        choices: ['Twenty', 'Thirty', 'Ten', 'A hundred'],
        correctIndex: 0,
        explanation: 'They sold Joseph to the Ishmaelites for twenty pieces of silver.',
      },
      {
        type: 'choice',
        question: 'Which brother said not to kill Joseph?',
        choices: ['Reuben', 'Simeon', 'Levi', 'Dan'],
        correctIndex: 0,
        explanation:
          'Reuben said not to take his life but to throw him into a pit. He meant to pull him out later in secret.',
      },
      {
        type: 'choice',
        question: 'Which brother proposed selling Joseph?',
        choices: ['Judah', 'Reuben', 'Naphtali', 'Asher'],
        correctIndex: 0,
        explanation:
          'Judah said, "What profit is it if we kill our brother and conceal his blood?" and proposed selling him to the traders.',
      },
      {
        type: 'choice',
        question: 'How did the brothers deceive their father?',
        choices: [
          'They dipped the coat in goat’s blood and sent it to him',
          'They wrote a false letter',
          'They said nothing',
          'They brought another boy',
        ],
        correctIndex: 0,
        explanation:
          'Jacob recognised the coat, believed a wild animal had torn him, and mourned for a long time.',
      },
      {
        type: 'choice',
        question: 'To which country was Joseph sold?',
        choices: ['Egypt', 'Canaan', 'Midian', 'Haran'],
        correctIndex: 0,
        explanation:
          'Joseph was taken down to Egypt and sold to Potiphar, an officer of Pharaoh and captain of the guard.',
      },
    ],
  },
  {
    book: 1,
    chapter: 38,
    summary:
      'Right in the middle of Joseph’s story, the account of Judah and Tamar cuts in. Judah’s eldest son marries Tamar and dies; the second, Onan, dodges his duty and dies as well. Judah promises his third son but keeps putting it off. When time passes and nothing comes of it, Tamar covers her face, sits by the road and meets Judah. He does not recognise her and leaves his seal, cord and staff as a pledge. Later, told that Tamar is pregnant, Judah angrily orders her brought out — until she produces those things, and he says, "She is more righteous than I."',
    questions: [
      {
        type: 'choice',
        question: 'Of whom did Judah say, "She is more righteous than I"?',
        choices: ['Tamar', 'Rebekah', 'Rachel', 'Dinah'],
        correctIndex: 0,
        explanation:
          'Judah admitted his own fault in not giving her his third son, and said Tamar was more righteous than he was.',
      },
      {
        type: 'choice',
        question: 'What did Tamar receive as a pledge?',
        choices: ['A seal, a cord and a staff', 'One sheep', 'A garment', 'Twenty pieces of silver'],
        correctIndex: 0,
        explanation:
          'They were the items that proved who he was, and later they became the evidence that turned Judah around.',
      },
      {
        type: 'choice',
        question: 'Why did Judah not give Tamar his third son?',
        choices: [
          'He was afraid that son would die too',
          'He disliked Tamar',
          'Only because the son was young',
          'The son was engaged to another woman',
        ],
        correctIndex: 0,
        explanation:
          'After two sons died one after the other, Judah was afraid Shelah would die as well, so he delayed his promise.',
      },
      {
        type: 'choice',
        question: 'What was tied on the twin whose hand came out first?',
        choices: ['A scarlet thread', 'A gold chain', 'A white cloth', 'Nothing at all'],
        correctIndex: 0,
        explanation:
          'The midwife tied a scarlet thread on his hand, but the hand drew back and the other child was born first.',
      },
      {
        type: 'choice',
        question: 'Which of Tamar’s twins later became an ancestor of David?',
        choices: ['Perez', 'Zerah', 'Onan', 'Shelah'],
        correctIndex: 0,
        explanation: 'Perez, who came out first, belongs to the line that leads on to David and to Jesus.',
      },
      {
        type: 'choice',
        question: 'Why does this chapter sit in the middle of Joseph’s story?',
        choices: [
          'To show what kind of man Judah was, and how he changed',
          'To fill out a genealogy',
          'To describe the land',
          'To record a war',
        ],
        correctIndex: 0,
        explanation:
          'The Judah who admits his fault here is the one who later, in chapter 44, offers to become a slave in Benjamin’s place. It is a story about a man changing.',
      },
      {
        type: 'choice',
        question: 'What did Judah’s second son Onan do?',
        choices: [
          'He avoided the duty of raising up offspring for his brother',
          'He left home',
          'He deceived his father',
          'He helped his brother',
        ],
        correctIndex: 0,
        explanation:
          'Onan knew the child would not be counted as his own and dodged the duty, and what he did was wicked in the sight of the LORD.',
      },
    ],
  },
  {
    book: 1,
    chapter: 39,
    summary:
      'Joseph works in the house of Potiphar in Egypt. The Bible keeps repeating one line — "the LORD was with Joseph." He prospered, and his master put everything in the house into his hands. But his master’s wife keeps trying to seduce him. Joseph refuses: "How then can I do this great wickedness and sin against God?" When she catches his garment he leaves it behind and runs. She uses that garment to accuse him falsely, and Joseph is thrown into prison. And there in the prison the Bible says the same thing again: the LORD was with Joseph.',
    questions: [
      {
        type: 'choice',
        question: 'What line keeps coming up in this chapter?',
        choices: ['The LORD was with Joseph', 'Joseph became rich', 'Joseph was sad', 'Joseph ran away'],
        correctIndex: 0,
        explanation:
          'The same line comes in the house and in the prison. His circumstances changed; God’s presence did not.',
      },
      {
        type: 'choice',
        question: 'What was the name of the Egyptian who bought Joseph?',
        choices: ['Potiphar', 'Pharaoh', 'Abimelech', 'Bethuel'],
        correctIndex: 0,
        explanation: 'Potiphar, an officer of Pharaoh and captain of the guard, bought Joseph.',
      },
      {
        type: 'choice',
        question: 'What did Joseph say when he refused?',
        choices: [
          'How can I do this great wickedness and sin against God?',
          'My master would be furious if he found out',
          'I am only a slave',
          'Another time',
        ],
        correctIndex: 0,
        explanation:
          'Joseph did not treat it as a risk of being caught by people, but as a matter of sinning against God.',
      },
      {
        type: 'choice',
        question: 'What did Joseph do when she seized his garment?',
        choices: [
          'He left the garment behind and went outside',
          'He snatched it back',
          'He shouted',
          'He fought',
        ],
        correctIndex: 0,
        explanation:
          'He left the garment in her hand and fled outside. That garment was then used as evidence against him.',
      },
      {
        type: 'choice',
        question: 'What happened to Joseph after he was put in prison?',
        choices: [
          'He won the keeper’s trust and was put in charge of the prisoners',
          'He was soon released',
          'He fell ill',
          'He was sold to another country',
        ],
        correctIndex: 0,
        explanation:
          'The LORD was with him and gave him favour, so the keeper of the prison put all the prisoners in Joseph’s hands.',
      },
      {
        type: 'choice',
        question: 'How much did Potiphar entrust to Joseph?',
        choices: [
          'Everything he owned, except the food he ate',
          'Only the yard',
          'Only the livestock',
          'Nothing at all',
        ],
        correctIndex: 0,
        explanation:
          'Potiphar concerned himself with nothing except the food he ate, and left all the rest to Joseph.',
      },
      {
        type: 'choice',
        question: 'Who accused Joseph falsely?',
        choices: ['Potiphar’s wife', 'The chief cupbearer', 'The chief baker', 'The keeper of the prison'],
        correctIndex: 0,
        explanation: 'His master’s wife made a false accusation, using Joseph’s garment as her evidence.',
      },
    ],
  },
  {
    book: 1,
    chapter: 40,
    summary:
      'Two of Pharaoh’s officials are put in the prison: the chief cupbearer and the chief baker. One night they both dream, and in the morning they are troubled. Joseph notices their faces and asks, and they say there is no one to interpret. Joseph answers, "Do not interpretations belong to God?" and explains their dreams. Three days later the cupbearer is restored and the baker is executed, exactly as he said. Joseph asked the cupbearer to remember him — but the cupbearer forgot him.',
    questions: [
      {
        type: 'choice',
        question: 'What did Joseph say about interpreting dreams?',
        choices: [
          'Do not interpretations belong to God?',
          'I am good at this',
          'No one can interpret them',
          'I will tell you later',
        ],
        correctIndex: 0,
        explanation:
          'Joseph gave the credit to God rather than to himself. He says the same thing before Pharaoh in chapter 41.',
      },
      {
        type: 'choice',
        question: 'Who were the two men in the prison who dreamed?',
        choices: ['The chief cupbearer and the chief baker', 'Two soldiers', 'Two merchants', 'Two priests'],
        correctIndex: 0,
        explanation: 'They were Pharaoh’s chief cupbearer and chief baker, who had offended him.',
      },
      {
        type: 'choice',
        question: 'What became of the chief cupbearer’s dream?',
        choices: [
          'He was restored to his post in three days',
          'He died in three days',
          'Nothing happened',
          'He went to another country',
        ],
        correctIndex: 0,
        explanation:
          'Just as Joseph said, in three days he went back to putting the cup into Pharaoh’s hand as before.',
      },
      {
        type: 'choice',
        question: 'What did the "three" in both dreams stand for, according to Joseph?',
        choices: ['Three days', 'Seven days', 'Three months', 'Three years'],
        correctIndex: 0,
        explanation: 'He explained that the three branches and the three baskets each stood for three days.',
      },
      {
        type: 'choice',
        question: 'What did Joseph ask of the chief cupbearer?',
        choices: [
          'To remember him and speak to Pharaoh once he was restored',
          'To bring him food',
          'To bring him clothes',
          'To carry a letter',
        ],
        correctIndex: 0,
        explanation: 'Joseph explained that he had been taken away unjustly and asked to be remembered.',
      },
      {
        type: 'choice',
        question: 'How does this chapter end?',
        choices: [
          'The chief cupbearer did not remember Joseph, but forgot him',
          'Joseph was soon released',
          'Pharaoh sent for Joseph',
          'Joseph escaped',
        ],
        correctIndex: 0,
        explanation:
          'It ends, "yet the chief cupbearer did not remember Joseph, but forgot him." Joseph stayed in prison two more full years.',
      },
      {
        type: 'choice',
        question: 'How did Joseph notice that the two men were troubled?',
        choices: [
          'By the look on their faces',
          'By what they said',
          'By having the same dream',
          'By hearing it from the keeper',
        ],
        correctIndex: 0,
        explanation:
          'In the morning Joseph saw that they looked troubled and asked, "Why are your faces downcast today?"',
      },
    ],
  },
];
