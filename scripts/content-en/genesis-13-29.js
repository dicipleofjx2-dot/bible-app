/**
 * Bible Reading Helper content (English) — Genesis 13–29
 *
 * Mirrors scripts/content/genesis-13-29.js chapter for chapter, question for
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
    chapter: 13,
    summary:
      'Abram and his nephew Lot part ways. Both had so many animals that their herdsmen began to quarrel, so Abram spoke first: "If you go to the left, I will go to the right." The older man, the one God had called, gave up the right to choose. Lot picked the well-watered plain of the Jordan and moved toward Sodom. The Bible tells us right away that the people of Sodom were wicked and great sinners. After Lot left, God told Abram to lift up his eyes and look in every direction, and promised him this land again.',
    questions: [
      {
        type: 'choice',
        question: 'Why did Abram and Lot separate?',
        choices: [
          'They owned too much to live together and their herdsmen quarrelled',
          'They had fallen out with each other',
          'A war broke out',
          'God commanded it',
        ],
        correctIndex: 0,
        explanation:
          'Their animals and possessions were so many that one stretch of land could not hold them both, and their herdsmen started fighting.',
      },
      {
        type: 'choice',
        question: 'What did Abram offer Lot?',
        choices: [
          'You choose first, and I will take the other side',
          'I will choose first',
          'Let us keep living together',
          'Leave',
        ],
        correctIndex: 0,
        explanation:
          'Abram was the elder and the one God had called, yet he gave up the right to choose. Not quarrelling mattered more to him.',
      },
      {
        type: 'choice',
        question: 'Which land did Lot choose?',
        choices: [
          'The whole plain of the Jordan, toward Sodom',
          'The hill country',
          'The desert',
          'The seashore',
        ],
        correctIndex: 0,
        explanation:
          'Lot chose the Jordan plain because it was well watered and looked like the garden of the LORD, and he moved as far as Sodom.',
      },
      {
        type: 'choice',
        question: 'What does the Bible say in advance about the people of Sodom?',
        choices: [
          'They were wicked, great sinners before the LORD',
          'It was a land with plenty of water',
          'Abram’s relatives lived there',
          'The famine there was severe',
        ],
        correctIndex: 0,
        explanation:
          'It says, "the men of Sodom were wicked and sinners before the LORD exceedingly." That is the other side of a choice that looked good to the eye.',
      },
      {
        type: 'choice',
        question: 'What did God say to Abram after Lot left?',
        choices: [
          'Lift up your eyes and look around; I will give you this land',
          'Follow Lot',
          'Go to Egypt',
          'Wait',
        ],
        correctIndex: 0,
        explanation:
          'God promised him all the land he could see, and said He would make his offspring as many as the dust of the earth.',
      },
      {
        type: 'choice',
        question: 'Where did Abram move and build an altar?',
        choices: ['The oaks of Mamre at Hebron', 'Sodom', 'Bethel', 'Egypt'],
        correctIndex: 0,
        explanation: 'Abram moved to the oaks of Mamre at Hebron and built an altar to the LORD there.',
      },
      {
        type: 'choice',
        question: 'Where did Abram go back to after he came up out of Egypt?',
        choices: ['Bethel', 'Shechem', 'Hebron', 'Beersheba'],
        correctIndex: 0,
        explanation:
          'Abram went back to the place between Bethel and Ai where he had first built an altar, and there he called on the name of the LORD.',
      },
    ],
  },
  {
    book: 1,
    chapter: 14,
    summary:
      'This is the story of a war between four kings and five. Sodom loses, and Lot is carried off along with his goods. When Abram hears it, he takes 318 men trained in his own household, chases them by night, and brings Lot and the goods back. On the way home Melchizedek, king of Salem, comes out with bread and wine and blesses Abram, and Abram gives him a tenth of everything. But when the king of Sodom tells Abram to keep the goods, Abram refuses to take even a thread. He does not want anyone saying it was Sodom, not God, who made him rich.',
    questions: [
      {
        type: 'choice',
        question: 'Why did Abram set out with his men?',
        choices: [
          'Because his nephew Lot had been carried off',
          'To gain riches',
          'To become king',
          'To enlarge his land',
        ],
        correctIndex: 0,
        explanation:
          'When Abram heard that his nephew had been taken captive, he went after them with the men born and trained in his household.',
      },
      {
        type: 'choice',
        question: 'How many men did Abram take with him?',
        choices: ['318', '100', '600', '1,000'],
        correctIndex: 0,
        explanation: 'He led out 318 trained men born in his own house.',
      },
      {
        type: 'choice',
        question: 'Which king of Salem came out with bread and wine and blessed Abram?',
        choices: ['Melchizedek', 'Abimelech', 'Kedorlaomer', 'Bera'],
        correctIndex: 0,
        explanation:
          'Melchizedek, king of Salem, was priest of God Most High. He appears again later, in Hebrews, to explain who Jesus is.',
      },
      {
        type: 'choice',
        question: 'What did Abram give Melchizedek?',
        choices: ['A tenth of everything he had taken', 'Land', 'All his animals', 'Nothing at all'],
        correctIndex: 0,
        explanation: 'Abram gave Melchizedek a tenth of all that he had recovered.',
      },
      {
        type: 'choice',
        question: 'What did Abram answer when the king of Sodom told him to keep the goods?',
        choices: [
          'I will not take even a thread',
          'I will take half',
          'I will gladly take it',
          'I will take it later',
        ],
        correctIndex: 0,
        explanation:
          'He refused, saying, "lest you should say, I have made Abram rich." He did not want to blur the fact that his blessing came from God.',
      },
      {
        type: 'choice',
        question: 'How is Melchizedek introduced?',
        choices: [
          'King of Salem and priest of God Most High',
          'A commander of an army',
          'A merchant',
          'A farmer',
        ],
        correctIndex: 0,
        explanation: 'What is remarkable is that he was a king and a priest at the same time.',
      },
      {
        type: 'choice',
        question: 'How did Abram get Lot back?',
        choices: [
          'He divided his men and attacked by night',
          'He bought him back with money',
          'He begged the king',
          'He waited',
        ],
        correctIndex: 0,
        explanation:
          'Abram divided his men, attacked by night, chased them as far as Hobah north of Damascus, and brought everything back.',
      },
    ],
  },
  {
    book: 1,
    chapter: 15,
    summary:
      'Abram asks God an honest question: "I have no child — what will you give me?" God takes him outside, shows him the stars, and says, "So shall your offspring be." Then the Bible writes one of its most important sentences: Abram believed the LORD, and God counted it to him as righteousness. God then has him cut animals in two, and while Abram lies in a deep sleep a smoking firepot and a blazing torch pass between the pieces in the dark. It was a covenant God walked through alone, not a man.',
    questions: [
      {
        type: 'choice',
        question: 'What did God say when He showed Abram the stars?',
        choices: ['So shall your offspring be', 'Leave this land', 'Do not count the stars', 'Do not wait'],
        correctIndex: 0,
        explanation:
          'He told Abram to look at the stars and count them if he could, and said his offspring would be like them.',
      },
      {
        type: 'choice',
        question: '"Abram believed the LORD, and He counted it to him as ____." Fill in the blank.',
        choices: ['Righteousness', 'Blessing', 'A reward', 'A covenant'],
        correctIndex: 0,
        explanation:
          'This is one of the most important verses in the whole Bible for joining faith and righteousness. Romans and Galatians both quote it.',
      },
      {
        type: 'choice',
        question: 'What passed between the pieces of the animals when the covenant was made?',
        choices: ['A smoking firepot and a blazing torch', 'Abram', 'An angel', 'A wind'],
        correctIndex: 0,
        explanation:
          'Abram was in a deep sleep, and only the firepot and torch — which stand for God — passed through. We read it to mean God took the whole responsibility of keeping the covenant on Himself.',
      },
      {
        type: 'choice',
        question: 'What did God tell Abram ahead of time about his offspring?',
        choices: [
          'They would be servants in a land not theirs for four hundred years, then come out',
          'They would soon become kings',
          'They would live at ease',
          'They would be scattered',
        ],
        correctIndex: 0,
        explanation:
          'He said they would be strangers in a foreign land and be afflicted, and then come out with great possessions. It is the exodus, foretold.',
      },
      {
        type: 'choice',
        question: 'Whom did Abram first think of as his heir?',
        choices: ['Eliezer of Damascus', 'Lot', 'Ishmael', 'Isaac'],
        correctIndex: 0,
        explanation:
          'Having no child, Abram said that Eliezer, a servant born in his house, would be his heir.',
      },
      {
        type: 'choice',
        question: 'What were the first words God spoke to Abram here?',
        choices: [
          'Do not be afraid; I am your shield and your very great reward',
          'Leave',
          'Wait',
          'Build an altar',
        ],
        correctIndex: 0,
        explanation: 'The word came to him in a vision. God dealt first with the fear Abram was carrying.',
      },
      {
        type: 'choice',
        question: 'What was the honest question Abram brought to God about?',
        choices: [
          'Having no child',
          'Having nothing to eat',
          'Having no land',
          'Quarrelling with his brother',
        ],
        correctIndex: 0,
        explanation:
          'He said, "you have given me no offspring," laying his childlessness before God just as it was.',
      },
    ],
  },
  {
    book: 1,
    chapter: 16,
    summary:
      'There is a promise, but no child. After ten years Sarai comes up with a plan: give her servant Hagar to her husband and get a child that way. When Hagar becomes pregnant she looks down on Sarai, and Sarai treats her harshly. Hagar cannot bear it and runs away into the wilderness. But there, beside a spring, the angel of the LORD finds her, calls her by name, and asks, "Where have you come from, and where are you going?" He tells her to go back, and promises her a son, Ishmael. Hagar calls God "the God who sees me."',
    questions: [
      {
        type: 'choice',
        question: 'What was Sarai’s plan?',
        choices: [
          'To give her servant Hagar to her husband and get a child that way',
          'To move to another country',
          'To adopt a child',
          'To wait longer',
        ],
        correctIndex: 0,
        explanation: 'Worn out with waiting, Sarai reached for a human solution, and Abram listened to her.',
      },
      {
        type: 'choice',
        question: 'What name did Hagar call God?',
        choices: ['The God who sees me', 'God Almighty', 'The LORD Will Provide', 'The LORD is my Banner'],
        correctIndex: 0,
        explanation:
          'It means "the God who watches over me." In a wilderness where no one else was, she confessed that He had been looking at her.',
      },
      {
        type: 'choice',
        question: 'What did the angel of the LORD tell Hagar?',
        choices: [
          'Go back to your mistress and submit to her',
          'Go further away',
          'Stay here',
          'Go to Egypt',
        ],
        correctIndex: 0,
        explanation:
          'He told her to go back, and with it gave the promise, "I will surely multiply your offspring."',
      },
      {
        type: 'choice',
        question: 'What was the name of the son Hagar bore?',
        choices: ['Ishmael', 'Isaac', 'Midian', 'Keilah'],
        correctIndex: 0,
        explanation: 'God said to call him Ishmael, "because the LORD has listened to your affliction."',
      },
      {
        type: 'choice',
        question: 'What happened after Hagar became pregnant?',
        choices: [
          'She looked down on her mistress, and Sarai treated her harshly',
          'The two became close',
          'Abram sent Hagar away',
          'Nothing happened',
        ],
        correctIndex: 0,
        explanation:
          'Trying to get the promise by human means twisted the whole household. Sarai laid the blame for her misery on Abram.',
      },
      {
        type: 'choice',
        question: 'How old was Abram when Ishmael was born?',
        choices: ['Eighty-six', 'Seventy-five', 'Ninety-nine', 'A hundred'],
        correctIndex: 0,
        explanation: 'Abram was eighty-six years old when Hagar bore Ishmael.',
      },
      {
        type: 'choice',
        question: 'Where did Hagar meet the angel of the LORD?',
        choices: ['Beside a spring in the wilderness', 'Sodom', 'Hebron', 'Egypt'],
        correctIndex: 0,
        explanation:
          'She met him by a spring in the wilderness on the way to Shur, and she called that well Beer-lahai-roi.',
      },
    ],
  },
  {
    book: 1,
    chapter: 17,
    summary:
      'When Abram is ninety-nine, God appears to him again: "I am God Almighty; walk before me and be blameless." God changes their names. Abram becomes Abraham, "father of many," and Sarai becomes Sarah. Then God commands circumcision as the sign of the covenant — every male, whether born in the house or bought with money. When God says Sarah will have a son, Abraham falls on his face and laughs. How could a woman of ninety give birth? The son’s name is Isaac, which means "laughter."',
    questions: [
      {
        type: 'choice',
        question: 'What new name was Abram given?',
        choices: ['Abraham', 'Israel', 'Abimelech', 'Abner'],
        correctIndex: 0,
        explanation: 'He became Abraham, which means "father of many nations."',
      },
      {
        type: 'choice',
        question: 'What new name was Sarai given?',
        choices: ['Sarah', 'Rebekah', 'Hagar', 'Rachel'],
        correctIndex: 0,
        explanation:
          'God said to call her Sarah, and promised to bless her and make her a mother of nations.',
      },
      {
        type: 'choice',
        question: 'What did God command as the sign of the covenant?',
        choices: ['Circumcision', 'Sacrifice', 'Fasting', 'The tithe'],
        correctIndex: 0,
        explanation:
          'Every male was to be circumcised on the eighth day, including those born in the house and those bought with money.',
      },
      {
        type: 'choice',
        question: 'What did Abraham do when he heard he would have a son?',
        choices: ['He fell on his face and laughed', 'He wept', 'He grew angry', 'He said nothing'],
        correctIndex: 0,
        explanation:
          'He laughed to himself, wondering how a man of a hundred could have a child, and how Sarah could bear one.',
      },
      {
        type: 'choice',
        question: 'What name did God choose for the son who would be born?',
        choices: ['Isaac', 'Ishmael', 'Jacob', 'Esau'],
        correctIndex: 0,
        explanation: 'Isaac means "laughter." The name came out of the very place where he laughed.',
      },
      {
        type: 'choice',
        question: 'How did God introduce Himself to Abraham?',
        choices: ['God Almighty', 'The Holy God', 'A jealous God', 'The LORD of hosts'],
        correctIndex: 0,
        explanation: 'He said, "I am God Almighty," and told Abraham to walk before Him and be blameless.',
      },
      {
        type: 'choice',
        question: 'How did God answer Abraham’s request about Ishmael?',
        choices: [
          'He would bless Ishmael too and make him a great nation',
          'Forget Ishmael',
          'Send Ishmael away',
          'He said nothing',
        ],
        correctIndex: 0,
        explanation:
          'God said the covenant would be with Isaac, yet He would bless Ishmael and make him the father of twelve princes.',
      },
    ],
  },
  {
    book: 1,
    chapter: 18,
    summary:
      'In the heat of the day three men come to Abraham’s tent. He runs out to meet them and hurries to set food before them. When they say, "This time next year Sarah will have a son," Sarah, listening at the tent door, laughs to herself. God knows about that laugh and asks, "Is anything too hard for the LORD?" Then He tells Abraham what He is about to do to Sodom, and Abraham pleads for the city — six times, starting at fifty and coming down to ten.',
    questions: [
      {
        type: 'choice',
        question: '"Is anything too ____ for the LORD?" Fill in the blank.',
        choices: ['Hard', 'Costly', 'Clear', 'Loud'],
        correctIndex: 0,
        explanation:
          'God said it because He knew Sarah had laughed. It was His answer to a situation her age and body made impossible.',
      },
      {
        type: 'choice',
        question: 'What was the last number Abraham asked about for Sodom?',
        choices: ['Ten', 'Fifty', 'Twenty', 'Five'],
        correctIndex: 0,
        explanation:
          'He pleaded six times, going down from fifty to forty-five, forty, thirty, twenty and ten.',
      },
      {
        type: 'choice',
        question: 'Why did Sarah laugh?',
        choices: [
          'Because she and her husband were far too old',
          'Because the visitors were funny',
          'Because she was glad',
          'Only because she was too happy to believe it',
        ],
        correctIndex: 0,
        explanation:
          'She laughed to herself, saying, "After I am worn out, and my lord is old, shall I have pleasure?"',
      },
      {
        type: 'choice',
        question: 'How did Abraham receive his visitors?',
        choices: [
          'He ran to meet them, bowed low and hurried to prepare food',
          'He pretended not to see them',
          'He turned them away at the door',
          'He welcomed them slowly',
        ],
        correctIndex: 0,
        explanation:
          'Abraham ran out to welcome them, had Sarah quickly make bread, and killed a calf for them.',
      },
      {
        type: 'choice',
        question: 'What reason did God give for telling Abraham about Sodom?',
        choices: [
          'Because Abraham would become a great nation and teach his children the way of the LORD',
          'Because Abraham asked',
          'Only because Lot lived there',
          'No reason at all',
        ],
        correctIndex: 0,
        explanation:
          'He said, "Shall I hide from Abraham what I am about to do?" and spoke of how Abraham would teach his children the way of the LORD.',
      },
      {
        type: 'choice',
        question: 'When did God say Sarah would have a son?',
        choices: ['This time next year', 'In seven days', 'In three years', 'In ten years'],
        correctIndex: 0,
        explanation: 'He said, "I will surely return to you about this time next year."',
      },
      {
        type: 'choice',
        question: 'What did Abraham say as he pleaded?',
        choices: [
          'Will you sweep away the righteous with the wicked?',
          'Sodom has done no wrong',
          'Save only Lot',
          'I will go myself',
        ],
        correctIndex: 0,
        explanation:
          'He pleaded on the ground of God’s own justice: "Shall not the Judge of all the earth do what is just?"',
      },
    ],
  },
  {
    book: 1,
    chapter: 19,
    summary:
      'Two angels reach Sodom in the evening. Lot presses them to come into his house. That night the men of the city crowd around and demand the visitors. The angels urge Lot’s family to leave, but Lot lingers — so they take hold of his hand and pull him out. The Bible says it was "the LORD being merciful to him." Sulphur and fire pour down on Sodom and Gomorrah, and Lot’s wife, who looked back, becomes a pillar of salt. In the morning Abraham looks out from far off and sees the smoke going up like the smoke of a furnace.',
    questions: [
      {
        type: 'choice',
        question: 'What did the angels do when Lot lingered?',
        choices: [
          'They took him by the hand and pulled him out of the city',
          'They left him behind',
          'They waited longer',
          'They burned his house',
        ],
        correctIndex: 0,
        explanation: '"The LORD being merciful to him." Lot did not walk out on his own; he was dragged out.',
      },
      {
        type: 'choice',
        question: 'What happened to Lot’s wife, who looked back?',
        choices: [
          'She became a pillar of salt',
          'She turned to stone',
          'She was burned up',
          'She went blind',
        ],
        correctIndex: 0,
        explanation: 'Lot’s wife looked back, and she became a pillar of salt.',
      },
      {
        type: 'choice',
        question: 'What fell on Sodom and Gomorrah?',
        choices: ['Sulphur and fire', 'A great flood', 'An earthquake', 'Darkness'],
        correctIndex: 0,
        explanation:
          'The LORD rained sulphur and fire from heaven and destroyed those cities, the whole plain and everyone living there.',
      },
      {
        type: 'choice',
        question: 'What order did the angels give Lot?',
        choices: [
          'Escape for your life, and do not look back',
          'Stay in the house',
          'Persuade the men of the city',
          'Gather your possessions',
        ],
        correctIndex: 0,
        explanation:
          'They told him not to look back and not to stop anywhere in the valley, but to flee to the hills.',
      },
      {
        type: 'choice',
        question: 'What was the name of the little town Lot escaped to?',
        choices: ['Zoar', 'Sodom', 'Gomorrah', 'Shechem'],
        correctIndex: 0,
        explanation:
          'Lot said he could not reach the hills and begged to escape to a little town, and that town was called Zoar.',
      },
      {
        type: 'choice',
        question: 'How did Lot’s sons-in-law take what he told them?',
        choices: [
          'They thought he was joking',
          'They fled with him',
          'They believed and got ready',
          'They grew angry',
        ],
        correctIndex: 0,
        explanation: 'Lot told his sons-in-law to leave the city, but to them he seemed to be joking.',
      },
      {
        type: 'choice',
        question: 'What does the Bible give as the background of Lot’s rescue?',
        choices: [
          'God remembered Abraham and sent Lot out of the overthrow',
          'Only that Lot was righteous',
          'The angels made a mistake',
          'Lot paid a price',
        ],
        correctIndex: 0,
        explanation:
          'It says, "God remembered Abraham and sent Lot out of the midst of the overthrow." It carries straight on from the pleading in chapter 18.',
      },
    ],
  },
  {
    book: 1,
    chapter: 20,
    summary:
      'While staying in Gerar, Abraham again says Sarah is his sister — the very thing he did in Egypt back in chapter 12. Abimelech, king of Gerar, takes Sarah, but God comes to him in a dream: "You are a dead man, for the woman is married." Abimelech protests that he did it with a clear conscience, and God says He knows. Abimelech sends Sarah back and rebukes Abraham, who answers, "I thought there was no fear of God in this place."',
    questions: [
      {
        type: 'choice',
        question: 'What did Abraham say about Sarah in Gerar?',
        choices: [
          'That she was his sister',
          'That she was his wife',
          'He said nothing',
          'That he would leave',
        ],
        correctIndex: 0,
        explanation:
          'He repeated what he had done in Egypt in chapter 12 — the same mistake, made again out of fear.',
      },
      {
        type: 'choice',
        question: 'What was the name of the king of Gerar who took Sarah?',
        choices: ['Abimelech', 'Pharaoh', 'Melchizedek', 'Hamor'],
        correctIndex: 0,
        explanation: 'Abimelech, king of Gerar, sent and took Sarah.',
      },
      {
        type: 'choice',
        question: 'How did God come to Abimelech?',
        choices: ['In a dream at night', 'By sending an angel', 'By a voice only', 'Through a prophet'],
        correctIndex: 0,
        explanation: 'God came to Abimelech in a dream by night and warned him.',
      },
      {
        type: 'choice',
        question: 'What was Abimelech’s protest?',
        choices: [
          'I did this with an honest heart and clean hands',
          'I did not know, so it does not matter',
          'Abraham made me do it',
          'It is my right',
        ],
        correctIndex: 0,
        explanation:
          'God Himself acknowledged it: "I know that you have done this in the integrity of your heart."',
      },
      {
        type: 'choice',
        question: 'What reason did Abraham give for what he said?',
        choices: [
          'He thought there was no fear of God in that place and they would kill him',
          'Sarah wanted it',
          'To gain riches',
          'Only because he feared the king',
        ],
        correctIndex: 0,
        explanation: 'Abraham judged by his own guess, and this chapter shows that his guess was wrong.',
      },
      {
        type: 'choice',
        question: 'What did Abimelech give Abraham?',
        choices: [
          'Sheep, oxen, servants and a thousand pieces of silver',
          'Nothing at all',
          'Only land',
          'A punishment',
        ],
        correctIndex: 0,
        explanation:
          'Abimelech sent Sarah back, gave him livestock, servants and a thousand pieces of silver, and told him to settle wherever he liked.',
      },
      {
        type: 'choice',
        question: 'What did Abraham do for Abimelech?',
        choices: ['He prayed', 'He offered a sacrifice', 'He sent a gift', 'He swore an oath'],
        correctIndex: 0,
        explanation:
          'Abraham prayed, and God healed Abimelech, his wife and his servants so that they could have children again.',
      },
    ],
  },
  {
    book: 1,
    chapter: 21,
    summary:
      'At last Isaac is born, exactly at the time God had said. Sarah says, "God has made me laugh, and everyone who hears will laugh with me." But pain follows the joy. Sarah sees Ishmael mocking Isaac and tells Abraham to send Hagar and her son away; Abraham is distressed, but does it at God’s word. When the water runs out in the wilderness and the boy is dying, God hears the boy’s voice and opens Hagar’s eyes to see a well. The chapter ends with the covenant Abraham makes with Abimelech at Beersheba.',
    questions: [
      {
        type: 'choice',
        question: 'What did Sarah say after Isaac was born?',
        choices: [
          'God has made me laugh',
          'Now I will rest in peace',
          'No one will believe it',
          'I have won',
        ],
        correctIndex: 0,
        explanation: 'The laughter of disbelief in chapters 17 and 18 turns here into laughter of joy.',
      },
      {
        type: 'choice',
        question: 'How old was Abraham when Isaac was born?',
        choices: ['A hundred', 'Seventy-five', 'Ninety', 'A hundred and twenty'],
        correctIndex: 0,
        explanation: 'Isaac was born when Abraham was a hundred years old.',
      },
      {
        type: 'choice',
        question: 'What did God do when Hagar and the boy were in danger in the wilderness?',
        choices: [
          'He opened Hagar’s eyes and she saw a well of water',
          'He sent rain',
          'He sent a man to them',
          'He did nothing',
        ],
        correctIndex: 0,
        explanation:
          'God heard the voice of the boy, and when He opened Hagar’s eyes she saw a well of water.',
      },
      {
        type: 'choice',
        question: 'How did Abraham feel about sending Ishmael away?',
        choices: ['He was deeply distressed', 'He was glad', 'It did not trouble him', 'He was angry'],
        correctIndex: 0,
        explanation:
          'Abraham was deeply distressed over his son, but God told him to listen to Sarah, and promised to make Ishmael a great nation too.',
      },
      {
        type: 'choice',
        question: 'What was the name of the place where Abraham and Abimelech made their covenant?',
        choices: ['Beersheba', 'Bethel', 'Hebron', 'Gerar'],
        correctIndex: 0,
        explanation:
          'Because the two of them swore an oath there, the place was called Beersheba, "the well of the oath."',
      },
      {
        type: 'choice',
        question: 'Why did Abraham give Abimelech seven ewe lambs?',
        choices: [
          'As proof that he had dug that well himself',
          'As a gift',
          'To pay a price',
          'For a sacrifice',
        ],
        correctIndex: 0,
        explanation:
          'There had been a quarrel over a well Abimelech’s servants had seized, and Abraham left proof that the well was his.',
      },
      {
        type: 'choice',
        question: 'What does the Bible say about the timing of Isaac’s birth?',
        choices: [
          'At the very time God had spoken of',
          'Unexpectedly',
          'Without anyone knowing',
          'Long afterwards',
        ],
        correctIndex: 0,
        explanation:
          'It stresses that "the LORD visited Sarah as He had said, and the LORD did to Sarah as He had promised."',
      },
    ],
  },
  {
    book: 1,
    chapter: 22,
    summary:
      'This is the heaviest scene in Genesis. God tests Abraham: "Take your son, your only son Isaac, whom you love, and offer him as a burnt offering in the land of Moriah." Abraham gets up early in the morning and goes. After a three-day journey, climbing the mountain, Isaac asks, "Where is the lamb for the burnt offering?" Abraham answers, "God Himself will provide." When he raises the knife, the angel of the LORD calls out urgently. Behind him is a ram caught in a thicket by its horns. Abraham called that place "The LORD Will Provide."',
    questions: [
      {
        type: 'choice',
        question: 'What name did Abraham give that place?',
        choices: ['The LORD Will Provide', 'The LORD is my Banner', 'The LORD is Peace', 'El-Elohe-Israel'],
        correctIndex: 0,
        explanation:
          'The Bible says the saying "On the mount of the LORD it shall be provided" is still used today.',
      },
      {
        type: 'choice',
        question: 'What did Isaac ask as they climbed the mountain?',
        choices: [
          'Where is the lamb for the burnt offering?',
          'How much further do we have to go?',
          'Why are we going?',
          'When do we go home?',
        ],
        correctIndex: 0,
        explanation:
          'There was fire and wood, but no lamb. Abraham answered, "God Himself will provide the lamb."',
      },
      {
        type: 'choice',
        question: 'What happened when Abraham raised the knife?',
        choices: [
          'The angel of the LORD called from heaven and stopped him',
          'Isaac ran away',
          'It began to rain',
          'Nothing happened',
        ],
        correctIndex: 0,
        explanation:
          'He was stopped with the words, "Do not lay your hand on the boy." It was the moment Abraham’s fear of God was confirmed.',
      },
      {
        type: 'choice',
        question: 'What was offered in Isaac’s place?',
        choices: ['A ram caught in a thicket by its horns', 'A calf', 'A dove', 'A goat'],
        correctIndex: 0,
        explanation:
          'Abraham lifted his eyes and saw a ram behind him, caught by its horns in a thicket, and offered it instead.',
      },
      {
        type: 'choice',
        question: 'What was the name of the land God told Abraham to go to?',
        choices: ['Moriah', 'Ararat', 'Horeb', 'Sinai'],
        correctIndex: 0,
        explanation:
          'God told him to go to one of the mountains in the land of Moriah and offer the sacrifice there.',
      },
      {
        type: 'choice',
        question: 'What promise did God confirm again after this?',
        choices: [
          'I will make your offspring as many as the stars of heaven and the sand on the seashore',
          'I will make you very rich',
          'I will give you long life',
          'I will make you a king',
        ],
        correctIndex: 0,
        explanation:
          'He also renewed the promise that in Abraham’s offspring all the nations of the earth would be blessed.',
      },
      {
        type: 'choice',
        question: 'What was the first thing Abraham did after receiving the command?',
        choices: [
          'He rose early in the morning and saddled his donkey',
          'He talked it over with Sarah',
          'He only prayed',
          'He put it off',
        ],
        correctIndex: 0,
        explanation:
          'The Bible gives no explanation and no protest — it simply begins, "Abraham rose early in the morning." That obedience is the weight of this chapter.',
      },
    ],
  },
  {
    book: 1,
    chapter: 23,
    summary:
      'Sarah dies at a hundred and twenty-seven. Abraham mourns and weeps for her, then rises and asks the Hittites to sell him land for a burial place. They tell him, "You are a prince of God among us — use the best we have," but Abraham insists on paying the full price. In the end he buys Ephron’s field at Machpelah and its cave for four hundred shekels of silver, deeded as his own. The first land Abraham actually owned in the land of promise was his wife’s grave. Later Abraham, Isaac, Rebekah, Leah and Jacob are all buried in this cave.',
    questions: [
      {
        type: 'choice',
        question: 'How old was Sarah when she died?',
        choices: ['A hundred and twenty-seven', 'Ninety', 'A hundred', 'A hundred and thirty'],
        correctIndex: 0,
        explanation: 'Sarah lived a hundred and twenty-seven years and died at Hebron in the land of Canaan.',
      },
      {
        type: 'choice',
        question: 'What did Abraham ask of the Hittites?',
        choices: [
          'To sell him land for a burial place',
          'To give him water',
          'To give him a house',
          'To give him livestock',
        ],
        correctIndex: 0,
        explanation:
          'Abraham said he was a stranger and a sojourner among them, and asked them to sell him property for a grave.',
      },
      {
        type: 'choice',
        question: 'Why did Abraham insist on paying the full price?',
        choices: [
          'So that the land would clearly be his own',
          'Because he had plenty of money',
          'For the sake of appearances',
          'Because the Hittites demanded it',
        ],
        correctIndex: 0,
        explanation:
          'A gift could be disputed later. Abraham weighed out the silver so the land became legally his.',
      },
      {
        type: 'choice',
        question: 'What was the name of the cave Abraham bought?',
        choices: ['Machpelah', 'Mamre', 'Hebron', 'Beersheba'],
        correctIndex: 0,
        explanation: 'He bought the field of Machpelah, east of Mamre, and the cave that was in it.',
      },
      {
        type: 'choice',
        question: 'How much did Abraham pay?',
        choices: [
          'Four hundred shekels of silver',
          'A hundred shekels of silver',
          'A thousand shekels of silver',
          'Four hundred shekels of gold',
        ],
        correctIndex: 0,
        explanation:
          'He weighed out four hundred shekels of silver at the merchants’ current rate and gave it to Ephron.',
      },
      {
        type: 'choice',
        question: 'What did the Hittites call Abraham?',
        choices: ['A prince of God', 'A wanderer', 'A guest', 'A foreigner'],
        correctIndex: 0,
        explanation: 'They honoured him and told him to bury his dead in the choicest of their tombs.',
      },
      {
        type: 'choice',
        question: 'What is the meaning of this piece of land?',
        choices: [
          'It was the first land Abraham ever owned in the land of promise',
          'It was the largest land',
          'It was the most fertile land',
          'It was land given by a king',
        ],
        correctIndex: 0,
        explanation:
          'He had been promised the whole land, yet all he actually held in his lifetime was one cave to bury his wife in.',
      },
    ],
  },
  {
    book: 1,
    chapter: 24,
    summary:
      'Abraham, now old, sends his senior servant to find a wife for Isaac — not from the Canaanites, but from his own relatives back home. The servant takes ten camels, stands by a well and prays: "Let the woman who offers to water my camels too be the one." Before he finishes speaking, Rebekah comes out and does exactly that. The servant bows down and blesses God. Rebekah gets her family’s consent and leaves with one word: "I will go." Isaac, out meditating in the field in the evening, looks up and sees the camels coming.',
    questions: [
      {
        type: 'choice',
        question: 'What did Abraham send his servant to do?',
        choices: [
          'Bring a wife for Isaac from his own relatives back home',
          'Find a wife among the Canaanites',
          'Buy land',
          'Sell livestock',
        ],
        correctIndex: 0,
        explanation:
          'Abraham made it plain that Isaac was not to take a wife from the daughters of the Canaanites.',
      },
      {
        type: 'choice',
        question: 'What sign did the servant ask for at the well?',
        choices: [
          'A woman who would offer to water his camels as well',
          'The most beautiful woman',
          'The richest woman',
          'The first woman to speak to him',
        ],
        correctIndex: 0,
        explanation:
          'Drawing water for ten camels was no small labour. The sign was meant to show what kind of heart she had.',
      },
      {
        type: 'choice',
        question: 'What was the name of the woman he met at the well?',
        choices: ['Rebekah', 'Rachel', 'Leah', 'Milcah'],
        correctIndex: 0,
        explanation: 'Rebekah was the daughter of Bethuel and the granddaughter of Nahor, Abraham’s brother.',
      },
      {
        type: 'choice',
        question: 'What did Rebekah answer when her family asked her to stay a few more days?',
        choices: ['I will go', 'I will stay longer', 'I will think about it', 'I cannot go'],
        correctIndex: 0,
        explanation: 'Rebekah decided in a single word. Just as Abraham had left his homeland, so did she.',
      },
      {
        type: 'choice',
        question: 'What did the servant do after meeting Rebekah?',
        choices: [
          'He bowed his head and worshipped and blessed the LORD',
          'He hurried back',
          'He haggled over a price',
          'He waited without a word',
        ],
        correctIndex: 0,
        explanation:
          'He worshipped on the spot, saying, "The LORD has led me to the house of my master’s kinsmen."',
      },
      {
        type: 'choice',
        question: 'What was Isaac doing when Rebekah arrived?',
        choices: [
          'Meditating in the field toward evening',
          'Tending sheep',
          'Sleeping at home',
          'Digging a well',
        ],
        correctIndex: 0,
        explanation:
          'Isaac had gone out to meditate in the field toward evening, and when he looked up the camels were coming.',
      },
      {
        type: 'choice',
        question: 'What was the name of Rebekah’s brother?',
        choices: ['Laban', 'Bethuel', 'Nahor', 'Lamech'],
        correctIndex: 0,
        explanation: 'Laban is the uncle Jacob will later work for over twenty years.',
      },
    ],
  },
  {
    book: 1,
    chapter: 25,
    summary:
      'Abraham dies at a hundred and seventy-five, and Isaac and Ishmael bury him together in the cave of Machpelah. A short genealogy of Ishmael follows, and then the story moves to Isaac. Rebekah too was childless for a long time, and she conceives when Isaac prays. But the children struggle inside her, and God says, "Two nations are in your womb, and the older shall serve the younger." Esau and Jacob are born. One day Esau comes home worn out from hunting and sells his birthright for a bowl of stew. The Bible writes, "Thus Esau despised his birthright."',
    questions: [
      {
        type: 'choice',
        question: 'What happened inside Rebekah when she was pregnant?',
        choices: [
          'The children struggled with each other',
          'All was quiet',
          'Only one child moved',
          'Nothing happened',
        ],
        correctIndex: 0,
        explanation: 'The children struggled together within her, so Rebekah went to enquire of the LORD.',
      },
      {
        type: 'choice',
        question: 'God said to Rebekah, "The older shall serve the ____." Fill in the blank.',
        choices: ['Younger', 'Older', 'Firstborn', 'Stronger'],
        correctIndex: 0,
        explanation: 'It turned the usual order upside down. That announcement drives the rest of Genesis.',
      },
      {
        type: 'choice',
        question: 'What did Esau get for his birthright?',
        choices: ['Bread and lentil stew', 'Twenty pieces of silver', 'A flock of sheep', 'Land'],
        correctIndex: 0,
        explanation: 'Jacob gave him bread and lentil stew, and Esau ate, drank, got up and went his way.',
      },
      {
        type: 'choice',
        question: 'What verdict does the Bible give on Esau?',
        choices: ['He despised his birthright', 'He was wise', 'He was brave', 'He was treated unfairly'],
        correctIndex: 0,
        explanation: 'The passage closes with the words, "Thus Esau despised his birthright."',
      },
      {
        type: 'choice',
        question: 'How old was Abraham when he died?',
        choices: [
          'A hundred and seventy-five',
          'A hundred and twenty-seven',
          'A hundred and eighty',
          'A hundred and ten',
        ],
        correctIndex: 0,
        explanation: 'Abraham lived a hundred and seventy-five years and died at a good old age.',
      },
      {
        type: 'choice',
        question: 'What sort of men were Esau and Jacob?',
        choices: [
          'Esau was a hunter; Jacob was quiet, living in tents',
          'Both were hunters',
          'Both were farmers',
          'Esau was a shepherd and Jacob a merchant',
        ],
        correctIndex: 0,
        explanation: 'Isaac loved Esau because he had a taste for wild game, and Rebekah loved Jacob.',
      },
      {
        type: 'choice',
        question: 'What did Isaac do for Rebekah?',
        choices: [
          'He prayed to the LORD because she had no children',
          'He took another wife',
          'He only waited',
          'He went back home',
        ],
        correctIndex: 0,
        explanation: 'Isaac prayed to the LORD for his wife, the LORD answered him, and Rebekah conceived.',
      },
    ],
  },
  {
    book: 1,
    chapter: 26,
    summary:
      'When famine comes, Isaac too is about to go down to Egypt. God stops him: "Stay in this land; I will be with you and bless you." Yet Isaac, like his father, passes his wife Rebekah off as his sister, and Abimelech finds out and rebukes him. That year Isaac reaps a hundredfold and grows very rich. When the Philistines envy him and stop up his wells, Isaac does not fight — he moves on and digs again. Esek, Sitnah, and finally Rehoboth, where no one quarrelled. At Beersheba God appears and says, "Do not be afraid," and Isaac builds an altar.',
    questions: [
      {
        type: 'choice',
        question: 'What did God say to Isaac during the famine?',
        choices: [
          'Do not go down to Egypt; stay in this land',
          'Go to Egypt',
          'Go to the hills',
          'Go back to your homeland',
        ],
        correctIndex: 0,
        explanation: 'His father Abraham had gone down to Egypt, but Isaac was told to stay.',
      },
      {
        type: 'choice',
        question: 'What did Isaac call Rebekah in front of Abimelech?',
        choices: ['My sister', 'My wife', 'My daughter', 'He said nothing'],
        correctIndex: 0,
        explanation:
          'The son repeats the mistake his father made twice. He was afraid the men there would kill him because of Rebekah.',
      },
      {
        type: 'choice',
        question: 'What did Isaac name the third well, the one no one quarrelled over?',
        choices: ['Rehoboth', 'Esek', 'Sitnah', 'Beersheba'],
        correctIndex: 0,
        explanation:
          'He called it Rehoboth, saying, "Now the LORD has made room for us." The first two were Esek and Sitnah.',
      },
      {
        type: 'choice',
        question: 'What did Isaac do when his wells were taken from him?',
        choices: [
          'He did not quarrel; he moved on and dug again',
          'He fought and took them back',
          'He complained to the king',
          'He left the country',
        ],
        correctIndex: 0,
        explanation: 'Isaac gave way three times, and the giving way is what finally led him to open ground.',
      },
      {
        type: 'choice',
        question: 'How much did Isaac reap from the land that year?',
        choices: ['A hundredfold', 'Tenfold', 'Twofold', 'Thirtyfold'],
        correctIndex: 0,
        explanation:
          'He reaped a hundredfold that year, and the LORD blessed him so that he grew great and prospered.',
      },
      {
        type: 'choice',
        question: 'What did God say to Isaac at Beersheba?',
        choices: ['Do not be afraid, for I am with you', 'Leave', 'Fight', 'Wait'],
        correctIndex: 0,
        explanation:
          'He named Himself the God of Abraham and promised to bless Isaac and multiply his offspring.',
      },
      {
        type: 'choice',
        question: 'What did Abimelech come to Isaac to make?',
        choices: ['A covenant', 'A sacrifice', 'A marriage', 'A sale'],
        correctIndex: 0,
        explanation:
          'Abimelech said, "We have seen plainly that the LORD is with you," and they swore not to harm each other.',
      },
    ],
  },
  {
    book: 1,
    chapter: 27,
    summary:
      'Isaac has grown old and his eyes are dim. He tells Esau to hunt and make him the food he loves, and then he will bless him. Rebekah overhears and tells Jacob her plan: make the dish from young goats, put Esau’s clothes on him, and cover his smooth neck and hands with goatskins. Isaac hesitates — "The voice is Jacob’s voice, but the hands are the hands of Esau" — and blesses him anyway. Esau comes back too late and cries out loud. When Esau plans to kill Jacob, Rebekah sends him away to her brother Laban. Twenty years in a foreign land follow the blessing he got by trickery.',
    questions: [
      {
        type: 'choice',
        question: 'What did Rebekah tell Jacob to do?',
        choices: [
          'Make a dish from young goats and take his brother’s blessing in his place',
          'Persuade Esau',
          'Tell his father the truth',
          'Leave home',
        ],
        correctIndex: 0,
        explanation:
          'Rebekah made the plan. Jacob was afraid of being found out, but did as his mother said.',
      },
      {
        type: 'choice',
        question: 'What did Jacob put on his hands and neck?',
        choices: ['The skins of young goats', 'Wool', 'Cloth', 'Earth'],
        correctIndex: 0,
        explanation: 'Esau was a hairy man, so the skins were meant to fool his father’s touch.',
      },
      {
        type: 'choice',
        question: 'What did Isaac say as he wondered?',
        choices: [
          'The voice is Jacob’s voice, but the hands are the hands of Esau',
          'Who are you?',
          'Do not lie to me',
          'Get out',
        ],
        correctIndex: 0,
        explanation:
          'Isaac checked again and again, but in the end he did not recognise him and gave the blessing.',
      },
      {
        type: 'choice',
        question: 'How did Esau react when he learned the blessing was gone?',
        choices: [
          'He cried out loudly and begged for a blessing for himself too',
          'He accepted it quietly',
          'He blamed his father',
          'He left home',
        ],
        correctIndex: 0,
        explanation: 'Esau wept bitterly and cried out, "Bless me, even me also, O my father!"',
      },
      {
        type: 'choice',
        question: 'To whose house did Rebekah send Jacob for safety?',
        choices: ['Laban', 'Ishmael', 'Abimelech', 'Bethuel'],
        correctIndex: 0,
        explanation: 'Rebekah told him to stay with her brother Laban in Haran until Esau’s anger cooled.',
      },
      {
        type: 'choice',
        question: 'What did Esau resolve in his heart?',
        choices: [
          'To kill Jacob when the days of mourning for his father came',
          'To forgive him',
          'To leave home',
          'To go hunting again',
        ],
        correctIndex: 0,
        explanation: 'When Rebekah was told of it, she hurried Jacob away.',
      },
      {
        type: 'choice',
        question: 'What followed the blessing Jacob gained in this chapter?',
        choices: [
          'Leaving home and twenty years in a foreign land',
          'Becoming rich at once',
          'Being reconciled with his brother',
          'Inheriting his father’s wealth',
        ],
        correctIndex: 0,
        explanation:
          'A blessing gained by trickery was not enjoyed straight away. Jacob fled empty-handed and had a long, hard time of it.',
      },
    ],
  },
  {
    book: 1,
    chapter: 28,
    summary:
      'Isaac calls Jacob, tells him not to marry a Canaanite woman, blesses him and sends him to Laban. Fleeing from his brother, Jacob stops at sunset, takes a stone for a pillow and sleeps. That night he dreams of a ladder set on the earth reaching to heaven, with the angels of God going up and down it. God stands above it and says, "I am with you and will keep you wherever you go, and I will bring you back to this land." Jacob wakes and says, "Surely the LORD is in this place, and I did not know it," and calls the place Bethel, the house of God.',
    questions: [
      {
        type: 'choice',
        question: 'What did Jacob see in his dream?',
        choices: [
          'A ladder from earth to heaven with the angels of God going up and down',
          'A great flood',
          'A pillar of fire',
          'A bright star',
        ],
        correctIndex: 0,
        explanation: 'It was a scene of heaven and earth joined, and God was standing above it.',
      },
      {
        type: 'choice',
        question: 'What name did Jacob give that place?',
        choices: ['Bethel', 'Luz', 'Beersheba', 'Shechem'],
        correctIndex: 0,
        explanation: 'Bethel means "the house of God." The town had been called Luz before that.',
      },
      {
        type: 'choice',
        question: 'What did Jacob say when he woke up?',
        choices: [
          'Surely the LORD is in this place, and I did not know it',
          'It was only a dream',
          'I will go back home',
          'I am not afraid',
        ],
        correctIndex: 0,
        explanation: 'On the run, in an empty field with nothing at all, he found that God was there.',
      },
      {
        type: 'choice',
        question: 'What did God promise Jacob?',
        choices: [
          'To be with him and keep him wherever he went, and bring him back to this land',
          'To make him rich straight away',
          'To punish his brother',
          'To give him a long life',
        ],
        correctIndex: 0,
        explanation: 'He said, "I will not leave you until I have done what I have promised you."',
      },
      {
        type: 'choice',
        question: 'What did Jacob do when he got up in the morning?',
        choices: [
          'He set up the stone he had slept on as a pillar and poured oil on it',
          'He left at once',
          'He built a house',
          'He offered a sacrifice',
        ],
        correctIndex: 0,
        explanation:
          'He marked the place and made a vow — that if God went with him, the LORD would be his God.',
      },
      {
        type: 'choice',
        question: 'What did Jacob promise to give in his vow?',
        choices: ['A tenth of everything', 'His flocks', 'His firstborn son', 'Land'],
        correctIndex: 0,
        explanation: 'He said, "Of all that you give me I will give a full tenth to you."',
      },
      {
        type: 'choice',
        question: 'What did Jacob use for a pillow?',
        choices: ['A stone', 'His cloak', 'Wool', 'A bundle of straw'],
        correctIndex: 0,
        explanation:
          'He took a stone from that place, put it under his head and lay down. It shows exactly how a man on the run was living.',
      },
    ],
  },
  {
    book: 1,
    chapter: 29,
    summary:
      'Jacob reaches Haran and meets Rachel at a well. Staying in his uncle Laban’s house, he comes to love her and offers to work seven years to have her as his wife. The Bible says they "seemed to him but a few days because of the love he had for her." But on the wedding night Laban sends in the elder sister, Leah. When Jacob confronts him in the morning, Laban says, "It is not our custom to give the younger before the firstborn." So Jacob works another seven years for Rachel. The deceiver has been deceived.',
    questions: [
      {
        type: 'choice',
        question: 'How long did Jacob agree to work for Rachel?',
        choices: ['Seven years', 'Three years', 'Ten years', 'Twenty years'],
        correctIndex: 0,
        explanation: 'He promised, "I will serve you seven years for your younger daughter Rachel."',
      },
      {
        type: 'choice',
        question:
          '"They seemed to him but a ____ days because of the love he had for her." Fill in the blank.',
        choices: ['Few', 'Single', 'Long', 'Hard'],
        correctIndex: 0,
        explanation: 'It is a verse that shows what love does to the feel of time.',
      },
      {
        type: 'choice',
        question: 'What did Laban do on the wedding night?',
        choices: [
          'He sent in the elder sister Leah instead of Rachel',
          'He held no feast',
          'He drove Jacob out',
          'He demanded a higher price',
        ],
        correctIndex: 0,
        explanation:
          'Only in the morning did Jacob see it was Leah. The man who had stolen his brother’s blessing by a trick was now tricked himself.',
      },
      {
        type: 'choice',
        question: 'What reason did Laban give?',
        choices: [
          'It is not done in our country to give the younger before the firstborn',
          'Rachel did not want it',
          'The price was not enough',
          'It was a mistake',
        ],
        correctIndex: 0,
        explanation: 'Laban appealed to local custom and told Jacob to work another seven years for Rachel.',
      },
      {
        type: 'choice',
        question: 'How many years in all did Jacob work for his two wives?',
        choices: ['Fourteen years', 'Seven years', 'Twenty years', 'Ten years'],
        correctIndex: 0,
        explanation: 'Seven years for Leah and seven more for Rachel — fourteen in all.',
      },
      {
        type: 'choice',
        question: 'What background does the Bible give for Leah bearing sons?',
        choices: [
          'The LORD saw that she was not loved and opened her womb',
          'Because Leah prayed',
          'Because Laban asked',
          'Because Jacob wanted it',
        ],
        correctIndex: 0,
        explanation:
          'It is the place where God notices the less-loved one first. Leah bears Reuben, Simeon, Levi and Judah.',
      },
      {
        type: 'choice',
        question: 'Where did Jacob first meet Rachel?',
        choices: ['At a well', 'In a tent', 'In a field', 'At the city gate'],
        correctIndex: 0,
        explanation: 'Jacob rolled the stone from the well, watered Rachel’s flock, and then wept aloud.',
      },
    ],
  },
];
