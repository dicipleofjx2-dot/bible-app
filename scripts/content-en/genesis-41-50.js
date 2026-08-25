/**
 * Bible Reading Helper content (English) — Genesis 41–50
 *
 * Mirrors scripts/content/genesis-41-50.js chapter for chapter, question for
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
    chapter: 41,
    summary:
      'Two full years after Joseph was left in prison, Pharaoh has a dream. Seven thin cows eat seven fat ones, and seven withered ears of grain swallow seven good ones. When no one can interpret it, the chief cupbearer finally remembers Joseph. Before Pharaoh, Joseph says the same thing he said in prison: "It is not in me; God will give Pharaoh the answer." Seven years of plenty would be followed by seven years of famine. Joseph even proposes a plan, and Pharaoh makes him ruler over Egypt. He was thirty years old.',
    questions: [
      {
        type: 'choice',
        question: 'In Pharaoh’s dream, what swallowed the seven fat cows?',
        choices: ['Seven ugly, thin cows', 'A lion', 'Water', 'Fire'],
        correctIndex: 0,
        explanation:
          'The thin cows ate the fat ones and still looked as ugly as before. It meant famine would wipe out every trace of plenty.',
      },
      {
        type: 'choice',
        question: 'What did Joseph say in front of Pharaoh?',
        choices: [
          'It is not in me; God will give Pharaoh the answer',
          'I am good at this',
          'Pay me and I will interpret',
          'No one can interpret it',
        ],
        correctIndex: 0,
        explanation:
          'It is word for word what he said to the two officials in prison. His position changed; his attitude did not.',
      },
      {
        type: 'short',
        question: 'How many years of plenty and of famine did the dream mean? (number only)',
        acceptedAnswers: ['7', 'seven', '7 years'],
        explanation: 'It meant seven years of great plenty, followed by seven years of famine.',
      },
      {
        type: 'choice',
        question: 'What plan did Joseph propose to Pharaoh?',
        choices: [
          'Take a fifth of the grain during the years of plenty and store it',
          'Buy grain from other countries',
          'Move the people elsewhere',
          'He proposed nothing',
        ],
        correctIndex: 0,
        explanation:
          'He said to appoint a discerning and wise man to store the grain of the good years for use in the famine.',
      },
      {
        type: 'short',
        question: 'How old was Joseph when he became ruler of Egypt? (number only)',
        acceptedAnswers: ['30', 'thirty', '30 years old'],
        explanation:
          'Joseph was thirty when he stood before Pharaoh — thirteen years after being sold at seventeen.',
      },
      {
        type: 'choice',
        question: 'What were the names of Joseph’s two sons?',
        choices: [
          'Manasseh and Ephraim',
          'Dan and Naphtali',
          'Perez and Zerah',
          'Shem and Ham',
        ],
        correctIndex: 0,
        explanation:
          'Manasseh means "God has made me forget," and Ephraim means "God has made me fruitful."',
      },
      {
        type: 'choice',
        question: 'Who remembered Joseph?',
        choices: ['The chief cupbearer', 'The chief baker', 'The keeper of the prison', 'Potiphar'],
        correctIndex: 0,
        explanation:
          'The same man who forgot him at the end of chapter 40 finally confessed his fault and remembered him two full years later.',
      },
    ],
  },
  {
    book: 1,
    chapter: 42,
    summary:
      'When the famine reaches Canaan, Jacob sends his sons to Egypt to buy grain. The brothers bow before Joseph. He recognises them; they do not recognise him. Joseph presses them hard, calling them spies, and says he will believe them only if they bring their youngest brother. Among themselves the brothers say, "We are being punished because of our brother." Joseph understands them and turns away and weeps. He keeps Simeon as a hostage, sends the rest home, and has each man’s money put back in his sack. Jacob says he will not let Benjamin go.',
    questions: [
      {
        type: 'choice',
        question: 'What happened when the brothers met Joseph?',
        choices: [
          'Joseph recognised them, but they did not recognise him',
          'They recognised each other',
          'Neither recognised the other',
          'Only the brothers recognised him',
        ],
        correctIndex: 0,
        explanation:
          'More than twenty years had passed and Joseph was dressed as a ruler of Egypt. He remembered his old dreams.',
      },
      {
        type: 'choice',
        question: 'What did Joseph accuse his brothers of being?',
        choices: ['Spies', 'Thieves', 'Murderers', 'Liars'],
        correctIndex: 0,
        explanation:
          'Joseph pressed them, saying, "You are spies," and demanded that they bring their youngest brother.',
      },
      {
        type: 'short',
        question: 'Which brother was kept as a hostage?',
        acceptedAnswers: ['Simeon'],
        explanation: 'Joseph took Simeon and had him bound before their eyes.',
      },
      {
        type: 'choice',
        question: 'What did the brothers say among themselves?',
        choices: [
          'We are being punished because of our brother',
          'This is unfair',
          'Let us run away',
          'Let us deceive the ruler',
        ],
        correctIndex: 0,
        explanation:
          'They brought up what they had done twenty years before. They were speaking through an interpreter, so they had no idea Joseph understood.',
      },
      {
        type: 'choice',
        question: 'What did Joseph do when he heard them?',
        choices: ['He turned away and wept', 'He grew angry', 'He laughed', 'He told them who he was'],
        correctIndex: 0,
        explanation:
          'Joseph turned away from them and wept, then came back and spoke to them. He still did not reveal himself.',
      },
      {
        type: 'choice',
        question: 'How did the brothers react when they found the money in their sacks?',
        choices: [
          'They were afraid and asked what God had done to them',
          'They were glad',
          'They divided the money',
          'They went back to return it',
        ],
        correctIndex: 0,
        explanation:
          'Their hearts sank and they turned trembling to one another, saying, "What is this that God has done to us?"',
      },
      {
        type: 'short',
        question: 'Which son did Jacob say he would never send?',
        acceptedAnswers: ['Benjamin'],
        explanation:
          'Jacob refused, saying Joseph was gone, Simeon was gone, and now they wanted to take Benjamin too.',
      },
    ],
  },
  {
    book: 1,
    chapter: 43,
    summary:
      'When the grain runs out they have to go back to Egypt — but without the youngest brother they cannot see the man’s face. Judah steps forward: "I will be surety for him." Jacob finally agrees, sends gifts and double the money, and prays, "May God Almighty grant you mercy." When Joseph sees Benjamin his heart is so moved that he goes into a private room and weeps. Then he holds a feast, seats the brothers in order of age, and gives Benjamin five times as much as the rest. The brothers look at one another in amazement, and they drink together.',
    questions: [
      {
        type: 'choice',
        question: 'Which brother offered himself as surety for Benjamin?',
        choices: ['Judah', 'Reuben', 'Simeon', 'Levi'],
        correctIndex: 0,
        explanation:
          'Judah said, "I will be a pledge for him; you may hold me responsible."',
      },
      {
        type: 'choice',
        question: 'What did Jacob pray as he sent his sons off?',
        choices: [
          'May God Almighty grant you mercy before the man',
          'May you come home safely',
          'May you get plenty of grain',
          'He said nothing',
        ],
        correctIndex: 0,
        explanation:
          'It was a prayer prayed alongside words that sound like resignation: "If I am bereaved of my children, I am bereaved."',
      },
      {
        type: 'choice',
        question: 'What did Joseph do when he saw Benjamin?',
        choices: [
          'His heart was moved and he went into a private room and wept',
          'He told them who he was at once',
          'He grew angry',
          'He sent them out',
        ],
        correctIndex: 0,
        explanation:
          'Joseph washed his face, came out, controlled himself and said, "Serve the food."',
      },
      {
        type: 'choice',
        question: 'Why were the brothers amazed at the feast?',
        choices: [
          'Because they were seated in order of age',
          'Because there was so much food',
          'Because Joseph spoke to them',
          'Because they got their money back',
        ],
        correctIndex: 0,
        explanation:
          'He knew the exact order of their ages, which nobody had ever told him.',
      },
      {
        type: 'short',
        question: 'How many times more was Benjamin’s portion than the others’? (number only)',
        acceptedAnswers: ['5', 'five', 'five times'],
        explanation: 'Benjamin’s portion was five times as much as any of theirs.',
      },
      {
        type: 'choice',
        question: 'What did the steward say when the brothers told him about the money in their sacks?',
        choices: [
          'Do not be afraid; your God put treasure in your sacks',
          'You stole it',
          'I know nothing about it',
          'I will take it back',
        ],
        correctIndex: 0,
        explanation:
          'The steward reassured them that he had received their money, and he brought Simeon out to them.',
      },
      {
        type: 'choice',
        question: 'What gifts did Jacob send to Egypt?',
        choices: [
          'Balm, honey, spices, myrrh, pistachio nuts and almonds',
          'Gold and silver',
          'Livestock',
          'Clothing',
        ],
        correctIndex: 0,
        explanation:
          'He sent a little of the best products of the land. In a famine, it was the best he could offer.',
      },
    ],
  },
  {
    book: 1,
    chapter: 44,
    summary:
      'Joseph sets up one last test. He has his steward hide his own silver cup in Benjamin’s sack. After the brothers leave, the steward chases them, searches the sacks, and the cup is found with Benjamin. The brothers tear their clothes and go back to the city. When Joseph says only the man with the cup will be his slave and the rest may go, Judah steps forward and speaks at length: their father’s life is bound up with this boy, and without him their father will die. Then he asks, "Please let me stay as a slave in place of the boy."',
    questions: [
      {
        type: 'choice',
        question: 'What did Joseph have put in Benjamin’s sack?',
        choices: ['His own silver cup', 'A lump of gold', 'Grain', 'A letter'],
        correctIndex: 0,
        explanation:
          'He had his silver cup hidden there and then had it found. It was a last test to see his brothers’ hearts.',
      },
      {
        type: 'choice',
        question: 'How did the brothers react when the cup was found?',
        choices: [
          'They tore their clothes and all went back to the city',
          'They left Benjamin behind and went on',
          'They ran away',
          'They fought',
        ],
        correctIndex: 0,
        explanation:
          'Not one of them abandoned Benjamin. They were no longer the brothers who had sold Joseph.',
      },
      {
        type: 'short',
        question: 'Which brother offered to become a slave in Benjamin’s place?',
        acceptedAnswers: ['Judah'],
        explanation:
          'The Judah who proposed selling Joseph in chapter 37 now offers to take his brother’s place.',
      },
      {
        type: 'choice',
        question: 'What reason did Judah give as he pleaded?',
        choices: [
          'That their father would die without the boy',
          'That he himself was innocent',
          'That he had not stolen the cup',
          'That he would pay more money',
        ],
        correctIndex: 0,
        explanation:
          'He said his father’s life was bound up with the boy’s, and that he could not bear to bring his father’s grey head down to the grave in sorrow.',
      },
      {
        type: 'choice',
        question: 'What sentence did Joseph first propose?',
        choices: [
          'Only the man with the cup would be a slave; the rest could go home',
          'All of them would be slaves',
          'All of them could go home',
          'All of them would be imprisoned',
        ],
        correctIndex: 0,
        explanation:
          'Offering to let the rest go was the test itself — and the brothers refused to take it.',
      },
      {
        type: 'choice',
        question: 'What did Judah reveal about his own position?',
        choices: [
          'That he had become surety for the boy',
          'That he was the firstborn',
          'That he was wealthy',
          'That he was ill',
        ],
        correctIndex: 0,
        explanation:
          'He had pledged himself before his father, and that is why he offered to stay in the boy’s place.',
      },
      {
        type: 'short',
        question: 'Why did the brothers tear their clothes in this chapter?',
        acceptedAnswers: ['the cup was found in Benjamin’s sack', 'the cup was found', 'out of grief', 'grief'],
        explanation:
          'Tearing one’s clothes was how people showed deep grief and despair.',
      },
    ],
  },
  {
    book: 1,
    chapter: 45,
    summary:
      'Listening to Judah, Joseph can hold back no longer. He sends everyone else out, weeps aloud, and says, "I am Joseph. Is my father still alive?" The brothers are so shocked they cannot answer. He calls them close and says something astonishing: "Do not be distressed that you sold me here, for God sent me before you to preserve life." Instead of blame, he sees God’s hand. Pharaoh is glad too and sends wagons to bring the whole family. Jacob does not believe it at first, but when he sees the wagons his spirit revives.',
    questions: [
      {
        type: 'short',
        question: 'What were Joseph’s first words when he revealed himself?',
        acceptedAnswers: ['I am Joseph', 'I am Joseph. Is my father still alive?'],
        explanation:
          '"I am Joseph. Is my father still alive?" It was one sentence, twenty-two years in coming.',
      },
      {
        type: 'choice',
        question: 'How did Joseph explain his being sold into Egypt?',
        choices: [
          'God sent him ahead to preserve life',
          'It was his brothers’ fault',
          'It was his fate',
          'It was chance',
        ],
        correctIndex: 0,
        explanation:
          'His brothers’ wrong did not disappear, but Joseph saw God working above it.',
      },
      {
        type: 'choice',
        question: 'What did Joseph urge his brothers to do?',
        choices: [
          'Not to be distressed or angry with themselves',
          'To take their punishment',
          'To leave',
          'To keep it a secret',
        ],
        correctIndex: 0,
        explanation:
          'He said, "Do not be distressed or angry with yourselves because you sold me here."',
      },
      {
        type: 'choice',
        question: 'How many years of famine did Joseph say were still to come?',
        choices: ['Five years', 'Two years', 'Seven years', 'Ten years'],
        correctIndex: 0,
        explanation:
          'Two years had already passed and five remained, so he told them to bring the family down to Egypt.',
      },
      {
        type: 'choice',
        question: 'How did Jacob react when he first heard the news?',
        choices: [
          'He was stunned and did not believe it',
          'He rejoiced at once',
          'He grew angry',
          'He said nothing',
        ],
        correctIndex: 0,
        explanation:
          'Only when he saw the wagons Joseph had sent did the spirit of Jacob revive.',
      },
      {
        type: 'short',
        question: 'What was the name of the land Joseph set aside for his family?',
        acceptedAnswers: ['Goshen', 'the land of Goshen'],
        explanation:
          'Joseph said he would settle his family in the land of Goshen so they would be near him.',
      },
      {
        type: 'choice',
        question: 'What did Joseph tell his brothers as he sent them off?',
        choices: ['Do not quarrel on the way', 'Come quickly', 'Say nothing', 'Spend little money'],
        correctIndex: 0,
        explanation:
          'He said, "Do not quarrel on the way." He knew they would start blaming one another.',
      },
    ],
  },
  {
    book: 1,
    chapter: 46,
    summary:
      'Jacob takes his whole household down to Egypt. On the way he offers sacrifices at Beersheba, and God speaks to him in a vision at night: "Do not be afraid to go down to Egypt. I will go down with you, and I will surely bring you up again." It was a step away from the land his fathers had been promised, so of course he was afraid — and God settled his fear first. Seventy people of Jacob’s household went down to Egypt. Joseph prepares his chariot, goes up to meet his father, and weeps on his neck a long while.',
    questions: [
      {
        type: 'choice',
        question: 'What did God say to Jacob at Beersheba?',
        choices: [
          'Do not be afraid to go down to Egypt; I will go down with you',
          'Do not go',
          'Wait',
          'Go alone',
        ],
        correctIndex: 0,
        explanation:
          'He promised both to go down with him and to surely bring him up again.',
      },
      {
        type: 'short',
        question: 'How many people of Jacob’s household went down to Egypt? (number only)',
        acceptedAnswers: ['70', 'seventy', '70 people'],
        explanation: 'Seventy people in all came to Egypt with Jacob.',
      },
      {
        type: 'choice',
        question: 'Where did Jacob offer sacrifices on the way to Egypt?',
        choices: ['Beersheba', 'Bethel', 'Hebron', 'Shechem'],
        correctIndex: 0,
        explanation:
          'Beersheba was also the place where his father Isaac had met God.',
      },
      {
        type: 'choice',
        question: 'What happened when Joseph and Jacob met?',
        choices: [
          'Joseph fell on his neck and wept a long while',
          'They only greeted each other',
          'They went straight to the palace',
          'They did not recognise each other',
        ],
        correctIndex: 0,
        explanation:
          'Jacob said, "Now let me die, since I have seen your face and know you are still alive."',
      },
      {
        type: 'choice',
        question: 'What did Joseph tell his family to say before Pharaoh?',
        choices: [
          'Say that you are keepers of livestock',
          'Say that you are farmers',
          'Say nothing',
          'Say that you are merchants',
        ],
        correctIndex: 0,
        explanation:
          'Egyptians kept their distance from shepherds, so saying this would let the family settle apart in Goshen.',
      },
      {
        type: 'short',
        question: 'What was the name of the land Jacob’s family settled in?',
        acceptedAnswers: ['Goshen', 'the land of Goshen'],
        explanation:
          'Goshen was good land for livestock and let them live apart from the Egyptians.',
      },
      {
        type: 'choice',
        question: 'Why did Jacob have reason to fear going down to Egypt?',
        choices: [
          'Because it meant leaving the land God had promised',
          'Because the way was long',
          'Because he did not trust Joseph',
          'Because he had many animals',
        ],
        correctIndex: 0,
        explanation:
          'It was a step away from the land promised to Abraham and Isaac. That is why God settled his fear first.',
      },
    ],
  },
  {
    book: 1,
    chapter: 47,
    summary:
      'Joseph presents his brothers and his father to Pharaoh. When Pharaoh asks Jacob his age, he answers, "The years of my pilgrimage are a hundred and thirty. Few and hard have they been." Then he blesses Pharaoh. The family settles in Rameses, in the land of Goshen. The second half tells how, as the famine deepens, the Egyptians hand over money, livestock and land to buy grain. Joseph keeps the people alive and sets up a rule that a fifth goes to Pharaoh. Before he dies, Jacob makes Joseph swear not to bury him in Egypt but in the grave of his fathers.',
    questions: [
      {
        type: 'choice',
        question: 'What did Jacob answer when Pharaoh asked his age?',
        choices: [
          'The years of my pilgrimage are a hundred and thirty',
          'I do not remember',
          'A hundred',
          'I cannot say',
        ],
        correctIndex: 0,
        explanation:
          'Jacob called his life a "pilgrimage" and said his years had been few and hard.',
      },
      {
        type: 'choice',
        question: 'What did Jacob do for Pharaoh?',
        choices: ['He blessed him', 'He asked for gifts', 'He asked for land', 'He said nothing'],
        correctIndex: 0,
        explanation:
          'Jacob blessed Pharaoh both when he came in before him and when he went out.',
      },
      {
        type: 'short',
        question: 'What was the name of the good land where Jacob’s family settled?',
        acceptedAnswers: ['Rameses', 'Goshen', 'Rameses in the land of Goshen'],
        explanation: 'At Pharaoh’s command they were given a holding in Rameses, the best of the land of Egypt.',
      },
      {
        type: 'choice',
        question: 'What rule did Joseph set up during the famine?',
        choices: [
          'That a fifth of the harvest should go to Pharaoh',
          'That taxes should be abolished',
          'That the land should be shared out',
          'That grain should be given away free',
        ],
        correctIndex: 0,
        explanation:
          'Four fifths stayed with the people and a fifth went to Pharaoh, and the people said, "You have saved our lives."',
      },
      {
        type: 'choice',
        question: 'What did Jacob make Joseph swear?',
        choices: [
          'Not to bury him in Egypt, but in the grave of his fathers',
          'To divide up his property',
          'To forgive his brothers',
          'To go back to Canaan',
        ],
        correctIndex: 0,
        explanation:
          'Even dying in Egypt, Jacob wanted to be buried in the land of promise.',
      },
      {
        type: 'choice',
        question: 'What did the Egyptians finally hand over to buy grain?',
        choices: ['Their land and themselves', 'Their houses', 'Their clothes', 'Nothing at all'],
        correctIndex: 0,
        explanation:
          'When money and livestock ran out they gave their land and themselves, and Joseph gave them seed to farm again.',
      },
      {
        type: 'short',
        question: 'How many years did Jacob live in Egypt? (number only)',
        acceptedAnswers: ['17', 'seventeen', '17 years'],
        explanation:
          'Jacob lived seventeen years in the land of Egypt, and his years came to a hundred and forty-seven.',
      },
    ],
  },
  {
    book: 1,
    chapter: 48,
    summary:
      'Hearing that Jacob is ill, Joseph goes to him with his two sons, Manasseh and Ephraim. Jacob says he will count the two grandsons as his own, and tells again how he met God at Bethel. For the blessing Joseph puts the firstborn Manasseh at Jacob’s right hand and Ephraim at his left — but Jacob crosses his arms and lays his right hand on the younger, Ephraim. When Joseph tries to move it, Jacob says, "I know, my son, I know; but the younger shall be greater." Here too the younger comes before the elder.',
    questions: [
      {
        type: 'choice',
        question: 'What unusual thing did Jacob do as he blessed them?',
        choices: [
          'He crossed his arms and laid his right hand on the younger boy’s head',
          'He lifted both hands and prayed',
          'He embraced them without a word',
          'He leaned on his staff',
        ],
        correctIndex: 0,
        explanation:
          'It was not a mistake made by failing eyes; he did it knowingly. "I know, my son, I know," he said.',
      },
      {
        type: 'short',
        question: 'On which grandson did Jacob lay his right hand?',
        acceptedAnswers: ['Ephraim'],
        explanation:
          'He said the younger, Ephraim, would become a greater tribe than his brother Manasseh.',
      },
      {
        type: 'choice',
        question: 'What did Jacob declare about his two grandsons?',
        choices: [
          'That he would count them as his own sons',
          'That he would make them servants',
          'That he would leave them in Egypt',
          'That he would send them to Canaan',
        ],
        correctIndex: 0,
        explanation:
          'He said, "Ephraim and Manasseh shall be mine, as Reuben and Simeon are." That is why the two grandsons became tribes.',
      },
      {
        type: 'choice',
        question: 'Why did Joseph try to move his father’s hand?',
        choices: [
          'He thought the right hand belonged on the firstborn, Manasseh',
          'Only because he thought his father had made a mistake',
          'Because he disliked Ephraim',
          'Because he had mixed up the order',
        ],
        correctIndex: 0,
        explanation:
          'He believed the right hand’s blessing was the firstborn’s due. But Jacob did it knowing exactly what he was doing.',
      },
      {
        type: 'choice',
        question: 'How did Jacob describe the God he blessed them by?',
        choices: [
          'The God who has been my shepherd all my life, the angel who has redeemed me from all harm',
          'A distant God',
          'A fearful God',
          'An unknowable God',
        ],
        correctIndex: 0,
        explanation:
          'Jacob looked back over his whole life and named God that way.',
      },
      {
        type: 'short',
        question: 'Which place, where he had met God, did Jacob speak of again in this chapter?',
        acceptedAnswers: ['Bethel', 'Luz'],
        explanation:
          'He told his grandsons how God Almighty had appeared to him and blessed him at Luz (Bethel) in the land of Canaan.',
      },
      {
        type: 'choice',
        question: 'What extra thing did Jacob give Joseph?',
        choices: [
          'One portion of Shechem more than his brothers',
          'Gold and silver',
          'Livestock',
          'Nothing at all',
        ],
        correctIndex: 0,
        explanation:
          'Jacob gave Joseph one ridge of land at Shechem, which he had taken from the hand of the Amorites.',
      },
    ],
  },
  {
    book: 1,
    chapter: 49,
    summary:
      'Jacob calls his twelve sons and tells each what lies ahead. Not all of it is pleasant. Reuben the firstborn will not excel, because he defiled his father’s bed; Simeon and Levi will be scattered, because of what they did at Shechem. To Judah he speaks of kingship — "the sceptre shall not depart from Judah" — and of Joseph he says, "a fruitful bough," with rich blessing. When he has finished, Jacob charges his sons to bury him in the cave of Machpelah, draws his feet up into the bed and breathes his last.',
    questions: [
      {
        type: 'choice',
        question: 'What is the heart of what Jacob said to Judah?',
        choices: [
          'The sceptre shall not depart from Judah',
          'He will be the richest',
          'He will live longest',
          'He will be scattered',
        ],
        correctIndex: 0,
        explanation:
          'It means the ruler’s staff will not leave Judah. David and Jesus both come from this tribe.',
      },
      {
        type: 'choice',
        question: 'What did Jacob say about Simeon and Levi?',
        choices: [
          'Their anger was fierce, so they would be scattered',
          'They would be the strongest tribe',
          'They would become kings',
          'They would gain much land',
        ],
        correctIndex: 0,
        explanation:
          'He was speaking of what happened at Shechem in chapter 34. He did not say only pleasant things.',
      },
      {
        type: 'short',
        question: 'Which son did Jacob call "a fruitful bough"?',
        acceptedAnswers: ['Joseph'],
        explanation:
          '"Joseph is a fruitful bough, a fruitful bough by a spring," he said, and spoke of blessings of heaven and earth.',
      },
      {
        type: 'choice',
        question: 'What did Jacob say about Reuben, his firstborn?',
        choices: [
          'Unstable as water, he would not excel',
          'He would be the greatest',
          'He would become king',
          'He would be blessed above all',
        ],
        correctIndex: 0,
        explanation:
          'He held the firstborn’s rank, but because he defiled his father’s bed he would not excel.',
      },
      {
        type: 'short',
        question: 'Where did Jacob ask to be buried?',
        acceptedAnswers: ['Machpelah', 'the cave of Machpelah', 'the grave of his fathers', 'the cave at Hebron'],
        explanation:
          'He named the cave of Machpelah, where Abraham and Sarah, Isaac and Rebekah, and Leah were buried.',
      },
      {
        type: 'choice',
        question: 'What kind of words were these to his sons?',
        choices: [
          'Words telling each of them what lay ahead',
          'A division of property',
          'A will',
          'A simple farewell',
        ],
        correctIndex: 0,
        explanation:
          'He begins, "Gather round, that I may tell you what shall happen to you in days to come." It was blessing and forecast at once.',
      },
      {
        type: 'choice',
        question: 'How does the Bible describe Jacob’s death?',
        choices: [
          'He drew his feet up into the bed, breathed his last and was gathered to his people',
          'He collapsed suddenly',
          'He died on the road',
          'He died alone',
        ],
        correctIndex: 0,
        explanation:
          'He said everything he had to say, and it was a quiet, settled death.',
      },
    ],
  },
  {
    book: 1,
    chapter: 50,
    summary:
      'This is the last chapter of Genesis. Joseph falls on his father’s face and weeps, and the Egyptians mourn for seventy days. With Pharaoh’s permission he goes up to Canaan in a great procession and buries his father in the cave of Machpelah. Once their father is dead, the brothers are afraid that Joseph will now take revenge. Weeping, Joseph says, "You meant evil against me, but God meant it for good, to bring it about that many people should be kept alive, as they are today." Joseph dies at a hundred and ten, saying, "God will surely visit you and bring you up out of this land."',
    questions: [
      {
        type: 'short',
        question: '"You meant evil against me, but God meant it for ____." Fill in the blank.',
        acceptedAnswers: ['good'],
        explanation:
          'This one verse sums up the whole story of Joseph. It does not pretend his brothers’ evil never happened, yet it sees God’s hand.',
      },
      {
        type: 'choice',
        question: 'Why were the brothers afraid after their father died?',
        choices: [
          'They thought Joseph would now take revenge',
          'They feared another famine',
          'They feared being driven out of Egypt',
          'They feared losing their property',
        ],
        correctIndex: 0,
        explanation:
          'They sent a message asking forgiveness in their father’s name, and Joseph wept when he heard it.',
      },
      {
        type: 'choice',
        question: 'What did Joseph say to his brothers?',
        choices: [
          'Do not be afraid; I will provide for you and your little ones',
          'Now I will pay you back',
          'Leave me',
          'He said nothing',
        ],
        correctIndex: 0,
        explanation:
          'Joseph said, "Am I in the place of God?" and comforted them with kind words.',
      },
      {
        type: 'short',
        question: 'How old was Joseph when he died? (number only)',
        acceptedAnswers: ['110', 'a hundred ten', '110 years old'],
        explanation: 'Joseph died at a hundred and ten and was put in a coffin in Egypt.',
      },
      {
        type: 'choice',
        question: 'What did Joseph tell his brothers as he was dying?',
        choices: [
          'God will surely visit you and bring you up out of this land',
          'Stay in Egypt',
          'Forget me',
          'Divide up the property',
        ],
        correctIndex: 0,
        explanation:
          'He said it holding on to the promise made to Abraham. Genesis ends looking toward a promise not yet fulfilled.',
      },
      {
        type: 'choice',
        question: 'What did Joseph ask concerning his bones?',
        choices: [
          'Carry my bones up from here when God visits you',
          'Bury me in Egypt',
          'Scatter them in the sea',
          'He said nothing',
        ],
        correctIndex: 0,
        explanation:
          'Joseph’s bones did go up at the exodus, and were buried at Shechem in Joshua’s day.',
      },
      {
        type: 'choice',
        question: 'How long did the Egyptians mourn for Jacob?',
        choices: ['Seventy days', 'Thirty days', 'Seven days', 'A year'],
        correctIndex: 0,
        explanation:
          'The Egyptians wept for him seventy days, and after that a great procession went up to Canaan.',
      },
    ],
  },
];
