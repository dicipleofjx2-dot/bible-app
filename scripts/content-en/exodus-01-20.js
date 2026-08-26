/**
 * Bible Reading Helper content (English) — Exodus 1–20
 *
 * Mirrors scripts/content/exodus-01-20.js chapter for chapter, question for
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
    book: 2,
    chapter: 1,
    summary:
      'Joseph and all his brothers die, and time passes. The Israelites multiply greatly and fill the land of Egypt. A new king who does not know Joseph rises and is afraid of them, so he loads them with heavy labour — and something strange happens: the harder they are treated, the more they multiply. Pharaoh orders the Hebrew midwives to kill the baby boys, but Shiphrah and Puah fear God and do not do it, and God is good to them. In the end Pharaoh commands all his people to throw the baby boys into the Nile.',
    questions: [
      {
        type: 'choice',
        question: 'Why was Pharaoh afraid of the people of Israel?',
        choices: [
          'They had grown so many and strong that they might join his enemies in war',
          'They were wealthy',
          'They might set up a king',
          'They were not farming',
        ],
        correctIndex: 0,
        explanation:
          'He said, "The people of Israel are too many and too mighty for us," and proposed dealing shrewdly with them.',
      },
      {
        type: 'choice',
        question: 'What happened to the Israelites under the harsh treatment?',
        choices: [
          'They multiplied and spread out all the more',
          'Their numbers fell',
          'They scattered',
          'They surrendered',
        ],
        correctIndex: 0,
        explanation:
          '"The more they were oppressed, the more they multiplied and spread." Human plans could not stop God’s purpose.',
      },
      {
        type: 'choice',
        question: 'What were the names of the two midwives who disobeyed Pharaoh?',
        choices: ['Shiphrah and Puah', 'Miriam and Jochebed', 'Zipporah and Miriam', 'Jochebed and Puah'],
        correctIndex: 0,
        explanation: 'Shiphrah and Puah feared God and let the baby boys live.',
      },
      {
        type: 'choice',
        question: 'What came of the midwives fearing God?',
        choices: [
          'God dealt well with them and gave them families of their own',
          'They were punished',
          'They were driven out',
          'Nothing happened',
        ],
        correctIndex: 0,
        explanation: 'God was good to the midwives and gave them households of their own.',
      },
      {
        type: 'choice',
        question: 'What was Pharaoh’s final order?',
        choices: [
          'Throw every baby boy that is born into the Nile',
          'Make them all slaves',
          'Drive them out of the country',
          'Collect taxes from them',
        ],
        correctIndex: 0,
        explanation:
          'When working through the midwives failed, he gave the order directly to all his people.',
      },
      {
        type: 'choice',
        question: 'Which store cities did the Israelites build?',
        choices: ['Pithom and Rameses', 'Memphis and Thebes', 'Goshen and Zoar', 'Babel and Nineveh'],
        correctIndex: 0,
        explanation:
          'Taskmasters were set over them to afflict them with heavy burdens, and they built Pithom and Rameses.',
      },
      {
        type: 'choice',
        question: 'The chapter begins with a new king who did not know whom?',
        choices: ['Joseph', 'Jacob', 'Moses', 'Abraham'],
        correctIndex: 0,
        explanation:
          '"There arose a new king over Egypt, who did not know Joseph." The suffering begins when the man who saved Egypt is forgotten.',
      },
    ],
  },
  {
    book: 2,
    chapter: 2,
    summary:
      'A child is born into a family of Levi. His mother hides him for three months, and when she can hide him no longer she puts him in a basket among the reeds of the Nile. His sister watches from a distance. Pharaoh’s daughter comes down to bathe, finds the basket and lifts the child out. The sister steps forward and fetches a Hebrew nurse — the child’s own mother. The boy is named Moses. Grown up, Moses kills an Egyptian who was beating one of his own people and flees to Midian, where he marries Zipporah. Years pass, and the cry of Israel comes up to God.',
    questions: [
      {
        type: 'choice',
        question: 'How long did Moses’ mother hide him?',
        choices: ['Three months', 'One month', 'A year', 'Seven days'],
        correctIndex: 0,
        explanation:
          'Seeing he was a fine child, she hid him three months, and when she could hide him no longer she put him in a basket of reeds.',
      },
      {
        type: 'choice',
        question: 'Who lifted the child out of the water?',
        choices: ['Pharaoh’s daughter', 'A midwife', 'His sister', 'An Egyptian soldier'],
        correctIndex: 0,
        explanation:
          'Pharaoh’s daughter came down to the river to bathe, saw the basket among the reeds and had it brought to her.',
      },
      {
        type: 'choice',
        question: 'Who became the child’s nurse?',
        choices: ['His own mother', 'Pharaoh’s daughter', 'His sister', 'A neighbour'],
        correctIndex: 0,
        explanation:
          'His sister offered to call a Hebrew woman, and the woman she brought was his own mother — who was even paid to nurse her own son.',
      },
      {
        type: 'choice',
        question: 'What meaning does the Bible give for the name "Moses"?',
        choices: [
          'Drawn out of the water',
          'Raised in the wilderness',
          'Brought up as a prince',
          'Born after his brother',
        ],
        correctIndex: 0,
        explanation: 'She called him Moses, saying, "Because I drew him out of the water."',
      },
      {
        type: 'choice',
        question: 'Why did Moses flee to Midian?',
        choices: [
          'Because it came out that he had killed an Egyptian',
          'Because of a famine',
          'Because Pharaoh summoned him',
          'Because God commanded it',
        ],
        correctIndex: 0,
        explanation:
          'When a Hebrew said, "Who made you a ruler over us?" Moses realised the deed was known and ran.',
      },
      {
        type: 'choice',
        question: 'What was the name of the woman Moses married in Midian?',
        choices: ['Zipporah', 'Miriam', 'Jochebed', 'Elisheba'],
        correctIndex: 0,
        explanation:
          'He married Zipporah, daughter of the priest of Midian, and she bore him a son, Gershom.',
      },
      {
        type: 'choice',
        question: 'What did God do at the end of this chapter?',
        choices: [
          'He heard their groaning and remembered His covenant',
          'He punished Pharaoh',
          'He called Moses',
          'He did nothing',
        ],
        correctIndex: 0,
        explanation: 'God heard their groaning and remembered His covenant with Abraham, Isaac and Jacob.',
      },
    ],
  },
  {
    book: 2,
    chapter: 3,
    summary:
      'While keeping his father-in-law’s flock, Moses comes to Horeb. He sees a bush burning without being consumed, and when he turns aside God calls to him from inside it: "Take off your sandals; the place where you are standing is holy ground." God says He has seen Israel’s suffering and is sending Moses to Pharaoh. When Moses draws back — "Who am I?" — God answers, "I will certainly be with you." Asked His name, God says, "I AM WHO I AM."',
    questions: [
      {
        type: 'choice',
        question: 'What strange sight did Moses see?',
        choices: [
          'A bush on fire that was not burning up',
          'A rock splitting open',
          'The sky opening',
          'Water turning to blood',
        ],
        correctIndex: 0,
        explanation: 'God called to him when he turned aside, saying, "Why is the bush not burnt up?"',
      },
      {
        type: 'choice',
        question: 'What did God answer when Moses asked His name?',
        choices: [
          'I AM WHO I AM',
          'I am God Almighty',
          'I am the God of your father',
          'I am the LORD Will Provide',
        ],
        correctIndex: 0,
        explanation: '"I AM WHO I AM." It means He depends on no one — He simply is.',
      },
      {
        type: 'choice',
        question: 'What was the first thing God told Moses to do?',
        choices: ['Take off your sandals', 'Come closer', 'Bow down', 'Close your eyes'],
        correctIndex: 0,
        explanation:
          'He said, "The place where you are standing is holy ground," and had him take off his sandals.',
      },
      {
        type: 'choice',
        question: 'How did Moses first respond to the call?',
        choices: [
          'Who am I, that I should go to Pharaoh?',
          'I will go at once',
          'He was delighted',
          'He said nothing',
        ],
        correctIndex: 0,
        explanation: 'Moses drew back, and God answered, "I will certainly be with you."',
      },
      {
        type: 'choice',
        question: 'What land did God say He would bring Israel into?',
        choices: [
          'A land flowing with milk and honey',
          'The wilderness',
          'The best of Egypt',
          'An island across the sea',
        ],
        correctIndex: 0,
        explanation:
          'He promised to bring them to a good and spacious land, a land flowing with milk and honey.',
      },
      {
        type: 'choice',
        question: 'What was the name of the mountain where Moses met God?',
        choices: ['Horeb', 'Sinai', 'Moriah', 'Ararat'],
        correctIndex: 0,
        explanation: 'Horeb is the same mountain that is later called Sinai.',
      },
      {
        type: 'choice',
        question: 'How did God introduce Himself?',
        choices: [
          'The God of Abraham, the God of Isaac and the God of Jacob',
          'The LORD of hosts',
          'God Almighty',
          'The Holy God',
        ],
        correctIndex: 0,
        explanation:
          'He first made clear that He was the God who had kept the covenant with their fathers. Moses hid his face, afraid.',
      },
    ],
  },
  {
    book: 2,
    chapter: 4,
    summary:
      'Moses keeps drawing back. "What if they do not believe me?" God gives him three signs: a staff that becomes a snake, a hand that turns leprous and is healed, and water from the Nile that turns to blood. Still Moses says, "I am not good with words." God answers, "Who made man’s mouth?" and promises to be with him. When Moses finally asks God to send someone else, God is angry, but gives him his brother Aaron. Moses goes back to Egypt, and when the people hear that God has cared for them, they bow their heads and worship.',
    questions: [
      {
        type: 'choice',
        question: 'What was the first sign God gave Moses?',
        choices: [
          'A staff that became a snake',
          'Water turning to blood',
          'A hand turning white',
          'Fire falling',
        ],
        correctIndex: 0,
        explanation:
          'When he threw the staff on the ground it became a snake, and when he caught it by the tail it became a staff again.',
      },
      {
        type: 'choice',
        question: 'What was the last excuse Moses gave?',
        choices: [
          'I am slow of speech and slow of tongue',
          'I am too old',
          'The way is too long',
          'I have a family',
        ],
        correctIndex: 0,
        explanation:
          'God said, "Who made man’s mouth?" and promised to be with his mouth and teach him what to say.',
      },
      {
        type: 'choice',
        question: 'What was the name of the brother God gave Moses to help him?',
        choices: ['Aaron', 'Hur', 'Joshua', 'Caleb'],
        correctIndex: 0,
        explanation:
          'Aaron would speak to the people for Moses. God was angry when Moses still kept refusing.',
      },
      {
        type: 'choice',
        question: 'What was the second sign?',
        choices: [
          'His hand turning leprous inside his cloak and then being restored',
          'A staff blossoming',
          'The ground splitting',
          'The sun going dark',
        ],
        correctIndex: 0,
        explanation:
          'He put his hand inside his cloak and it came out leprous; he put it back and it was restored.',
      },
      {
        type: 'choice',
        question: 'What did the people do when they heard Moses and Aaron?',
        choices: [
          'They bowed their heads and worshipped',
          'They did not believe',
          'They were angry',
          'They went away',
        ],
        correctIndex: 0,
        explanation:
          'When they heard that the LORD had visited them and seen their misery, they bowed down and worshipped.',
      },
      {
        type: 'choice',
        question: 'What did God tell Moses in advance?',
        choices: [
          'Pharaoh’s heart would be hard and he would not let them go',
          'Pharaoh would agree at once',
          'The road would be rough',
          'The people would object',
        ],
        correctIndex: 0,
        explanation:
          'He said plainly that it would not come easily, and He called Israel "my son, my firstborn."',
      },
      {
        type: 'choice',
        question: 'In the third sign, what did the water of the Nile become?',
        choices: ['Blood', 'Bitter water', 'Fire', 'Sand'],
        correctIndex: 0,
        explanation:
          'If they would not believe the first two signs, Moses was to pour Nile water on the ground and it would become blood.',
      },
    ],
  },
  {
    book: 2,
    chapter: 5,
    summary:
      'Moses and Aaron stand before Pharaoh and say, "Let my people go." Pharaoh’s answer is cold: "Who is the LORD, that I should obey him?" That same day he orders the taskmasters to stop supplying straw for bricks — the people must gather their own, and still make the same number. They scatter to find straw and are beaten. The Israelite foremen appeal to Pharaoh, and it comes to nothing. They blame Moses and Aaron, and Moses in turn asks God, "Why have you brought trouble on this people?"',
    questions: [
      {
        type: 'choice',
        question: 'What was Pharaoh’s first answer to Moses?',
        choices: [
          'Who is the LORD, that I should obey him?',
          'Very well',
          'I will think about it',
          'Get out',
        ],
        correctIndex: 0,
        explanation: 'He said, "I do not know the LORD, and I will not let Israel go."',
      },
      {
        type: 'choice',
        question: 'What new order did Pharaoh give?',
        choices: [
          'Give them no straw, but require the same number of bricks',
          'Reduce their work',
          'Give them no food',
          'Tear down their houses',
        ],
        correctIndex: 0,
        explanation:
          'He said they were lazy — that is why they talked like this — and made the work heavier.',
      },
      {
        type: 'choice',
        question: 'What did the people say to Moses and Aaron?',
        choices: ['May the LORD look on you and judge', 'Thank you', 'Keep going', 'We will come with you'],
        correctIndex: 0,
        explanation:
          'They blamed them for making them a stench to Pharaoh and putting a sword in his hand to kill them.',
      },
      {
        type: 'choice',
        question: 'What did Moses say to God?',
        choices: [
          'Why have you brought trouble on this people?',
          'Thank you',
          'I will wait longer',
          'He said nothing',
        ],
        correctIndex: 0,
        explanation: 'He asked, "Why did you ever send me?" Obedience had made things worse, not better.',
      },
      {
        type: 'choice',
        question: 'What material ran short when the Israelites made bricks?',
        choices: ['Straw', 'Water', 'Clay', 'Wood'],
        correctIndex: 0,
        explanation:
          'They had to make bricks without straw and produce the same quota, so the people scattered over the land to gather stubble.',
      },
      {
        type: 'choice',
        question: 'Who were the ones who were beaten?',
        choices: ['The Israelite foremen', 'The taskmasters', 'Moses and Aaron', 'The midwives'],
        correctIndex: 0,
        explanation:
          'The Israelite foremen were beaten for not meeting the quota, and they appealed to Pharaoh.',
      },
      {
        type: 'choice',
        question: 'What does this chapter show?',
        choices: [
          'That things can get worse right after you start obeying',
          'That obedience makes things better at once',
          'That Pharaoh was a good king',
          'That Moses was in the wrong',
        ],
        correctIndex: 0,
        explanation: 'They did what God said and the situation got worse. God speaks again in chapter 6.',
      },
    ],
  },
  {
    book: 2,
    chapter: 6,
    summary:
      'God speaks again to a discouraged Moses: "Now you will see what I will do to Pharaoh." He says He appeared to Abraham, Isaac and Jacob as God Almighty, but did not make Himself known to them by the name the LORD. Then come seven promises one after another — He will bring them out, deliver them, redeem them, take them as His people, be their God, bring them into the land, and give it to them as a possession. But the people, broken in spirit and worn out by hard labour, do not listen. The rest of the chapter is a genealogy showing which tribe Moses and Aaron came from.',
    questions: [
      {
        type: 'choice',
        question: 'What did God say to the discouraged Moses?',
        choices: [
          'Now you will see what I will do to Pharaoh',
          'Wait',
          'Go back',
          'I will send someone else',
        ],
        correctIndex: 0,
        explanation:
          'He said that because of a mighty hand Pharaoh would let them go and even drive them out.',
      },
      {
        type: 'choice',
        question: 'Which of these was NOT among God’s promises here?',
        choices: [
          'I will make you rich',
          'I will bring you out from under their burdens',
          'I will take you as my people',
          'I will give you the land as a possession',
        ],
        correctIndex: 0,
        explanation:
          'The promises run: bring out, deliver, redeem, take as His people, be their God, bring in, and give as a possession.',
      },
      {
        type: 'choice',
        question: 'Why could the people not listen to Moses?',
        choices: [
          'Their spirit was broken and their labour was cruel',
          'They could not understand him',
          'They hated Moses',
          'Pharaoh stopped them',
        ],
        correctIndex: 0,
        explanation: 'They had no strength left even to hear good news.',
      },
      {
        type: 'choice',
        question: 'Which tribe did Moses and Aaron belong to?',
        choices: ['Levi', 'Judah', 'Benjamin', 'Reuben'],
        correctIndex: 0,
        explanation:
          'The genealogy in this chapter shows that Moses and Aaron were the sons of Amram and Jochebed of the tribe of Levi.',
      },
      {
        type: 'choice',
        question: 'Which name did God say He had not made known to their fathers?',
        choices: ['The LORD', 'El Shaddai', 'Elohim', 'Adonai'],
        correctIndex: 0,
        explanation:
          'He appeared to them as God Almighty, but did not make Himself known to them by the name the LORD.',
      },
      {
        type: 'choice',
        question: 'What did Moses say as he drew back again?',
        choices: [
          'I am a poor speaker; how then will Pharaoh listen to me?',
          'I cannot do it',
          'Give me time',
          'He said nothing',
        ],
        correctIndex: 0,
        explanation: 'His point was that if his own people would not listen, Pharaoh certainly would not.',
      },
      {
        type: 'choice',
        question: 'What were the names of Moses’ parents?',
        choices: ['Amram and Jochebed', 'Aaron and Miriam', 'Kohath and Jochebed', 'Amram and Elisheba'],
        correctIndex: 0,
        explanation: 'Amram married Jochebed, his father’s sister, and she bore him Aaron and Moses.',
      },
    ],
  },
  {
    book: 2,
    chapter: 7,
    summary:
      'God makes Moses like God to Pharaoh and Aaron his spokesman. When Aaron throws down his staff it becomes a snake — and the Egyptian magicians do the same. But Aaron’s staff swallows up theirs. Pharaoh’s heart is hard and he will not listen, so the first plague begins. The water of the Nile turns to blood, the fish die and the river stinks. The Egyptians dig along the riverbank looking for water to drink. When the magicians copy it too, Pharaoh turns away unmoved and goes into his palace. Seven days pass like this.',
    questions: [
      {
        type: 'choice',
        question: 'What happened when Aaron’s staff became a snake?',
        choices: [
          'It swallowed up the staffs of the Egyptian magicians',
          'It vanished',
          'It turned back into a staff',
          'Nothing happened',
        ],
        correctIndex: 0,
        explanation: 'The magicians did the same thing, but Aaron’s staff swallowed up theirs.',
      },
      {
        type: 'choice',
        question: 'What was the first plague?',
        choices: ['The water of the Nile turned to blood', 'Frogs', 'Gnats', 'Swarms of flies'],
        correctIndex: 0,
        explanation:
          'The water of the Nile turned to blood, the fish died and the river stank, so no one could drink from it.',
      },
      {
        type: 'choice',
        question: 'What did God say the Egyptians would learn through the plagues?',
        choices: [
          'That I am the LORD',
          'That Moses is strong',
          'That Israel is numerous',
          'That Pharaoh is weak',
        ],
        correctIndex: 0,
        explanation:
          'It makes plain that the point of the plagues was not punishment in itself, but knowing who the LORD is.',
      },
      {
        type: 'choice',
        question: 'What did the Egyptians do to get drinking water?',
        choices: [
          'They dug along the riverbank',
          'They waited for rain',
          'They went to the sea',
          'They did nothing',
        ],
        correctIndex: 0,
        explanation: 'They could not drink from the river, so they dug around it looking for water.',
      },
      {
        type: 'choice',
        question: 'How did Pharaoh respond?',
        choices: [
          'He hardened his heart and went into his palace',
          'He agreed at once',
          'He called Moses and apologised',
          'He let the people go',
        ],
        correctIndex: 0,
        explanation:
          'When his magicians did the same thing, he paid no attention to it and went into his house.',
      },
      {
        type: 'choice',
        question: 'How old was Moses when all this happened?',
        choices: ['Eighty', 'Forty', 'Sixty', 'A hundred and twenty'],
        correctIndex: 0,
        explanation: 'When they spoke to Pharaoh, Moses was eighty years old and Aaron eighty-three.',
      },
      {
        type: 'choice',
        question: 'How long did the first plague last?',
        choices: ['Seven days', 'One day', 'A month', 'Three days'],
        correctIndex: 0,
        explanation: 'Seven days passed after the LORD struck the Nile.',
      },
    ],
  },
  {
    book: 2,
    chapter: 8,
    summary:
      'The second, third and fourth plagues follow. Frogs come up over the whole land and fill the houses, the bedrooms, even the ovens. The magicians can make frogs come up too, but they cannot get rid of them. For the first time Pharaoh asks for help: "Pray to the LORD to take the frogs away." When Moses asks when, Pharaoh says, "Tomorrow." But as soon as he can breathe again he hardens his heart. The third plague turns the dust into gnats, and this time the magicians cannot copy it — they say, "This is the finger of God." From the fourth plague, the flies, the land of Goshen is set apart.',
    questions: [
      {
        type: 'choice',
        question: 'What was the second plague?',
        choices: ['Frogs', 'Gnats', 'Flies', 'Locusts'],
        correctIndex: 0,
        explanation:
          'Frogs came up out of the river and went into the houses, the bedrooms, the ovens and the kneading bowls.',
      },
      {
        type: 'choice',
        question: 'When Moses asked when the frogs should go, what did Pharaoh answer?',
        choices: ['Tomorrow', 'Right now', 'The day after tomorrow', 'Whenever'],
        correctIndex: 0,
        explanation:
          'It stands out that he did not say "now" but "tomorrow." He chose to spend one more night with the frogs.',
      },
      {
        type: 'choice',
        question: 'What did the magicians say when they could not copy it?',
        choices: ['This is the finger of God', 'We can do it too', 'Let us try again', 'They said nothing'],
        correctIndex: 0,
        explanation:
          'At the third plague, the gnats, the magicians gave up. Even so, Pharaoh’s heart stayed hard.',
      },
      {
        type: 'choice',
        question: 'From the fourth plague on, which land was set apart?',
        choices: ['Goshen', 'Rameses', 'Succoth', 'Pithom'],
        correctIndex: 0,
        explanation:
          'God said He would set apart the land of Goshen, where His people lived, so that no swarms of flies would be there.',
      },
      {
        type: 'choice',
        question: 'What compromise did Pharaoh offer?',
        choices: [
          'Offer your sacrifices here in this land',
          'All of you go',
          'Only the men may go',
          'Leave your livestock behind',
        ],
        correctIndex: 0,
        explanation:
          'Moses answered that their sacrifices were detestable to the Egyptians, so they had to go about three days into the wilderness.',
      },
      {
        type: 'choice',
        question: 'What did Pharaoh do after the frogs were gone?',
        choices: [
          'He got relief and hardened his heart again',
          'He kept his promise',
          'He let the people go',
          'He called Moses and thanked him',
        ],
        correctIndex: 0,
        explanation: 'It is written, "When Pharaoh saw that there was relief, he hardened his heart."',
      },
      {
        type: 'choice',
        question: 'What did the third plague come out of?',
        choices: ['The dust of the ground', 'Water', 'The sky', 'Trees'],
        correctIndex: 0,
        explanation:
          'Aaron struck the dust of the ground with his staff, and it became gnats throughout the whole land of Egypt.',
      },
    ],
  },
  {
    book: 2,
    chapter: 9,
    summary:
      'The fifth to the seventh plagues. First a severe disease kills the livestock of Egypt, while not one animal belonging to Israel dies. Next, ashes tossed toward the sky bring boils on people and animals, and the magicians cannot even stand before Moses because of their boils. The seventh is hail. God warns in advance and tells them to bring people and animals indoors, and those of Pharaoh’s officials who feared the word of the LORD brought their servants in. The hail struck the whole land of Egypt, but there was none in Goshen.',
    questions: [
      {
        type: 'choice',
        question: 'What happened to Israel’s livestock in the fifth plague?',
        choices: ['Not one of them died', 'Half of them died', 'All of them died', 'They fell ill'],
        correctIndex: 0,
        explanation: 'The livestock of Egypt died, but not one animal belonging to the Israelites died.',
      },
      {
        type: 'choice',
        question: 'What was the sixth plague?',
        choices: ['Boils', 'Hail', 'Locusts', 'Darkness'],
        correctIndex: 0,
        explanation:
          'When ashes from a furnace were tossed toward the sky, festering boils broke out on people and animals.',
      },
      {
        type: 'choice',
        question: 'What did God do before the plague of hail?',
        choices: [
          'He warned them in advance to bring people and animals indoors',
          'He struck without warning',
          'He summoned only Pharaoh',
          'He told only Israel',
        ],
        correctIndex: 0,
        explanation:
          'The officials who took the warning to heart brought in their servants and livestock; those who ignored it left them in the field.',
      },
      {
        type: 'choice',
        question: 'What reason did God give for raising Pharaoh up?',
        choices: [
          'To show His power and have His name proclaimed in all the earth',
          'To punish Pharaoh',
          'To destroy Egypt',
          'No reason at all',
        ],
        correctIndex: 0,
        explanation: 'Romans 9 quotes this verse. Even in judgement there was a purpose.',
      },
      {
        type: 'choice',
        question: 'Where did the hail not fall?',
        choices: ['The land of Goshen', 'The banks of the Nile', 'The palace', 'The wilderness'],
        correctIndex: 0,
        explanation: 'There was no hail in the land of Goshen, where the Israelites were.',
      },
      {
        type: 'choice',
        question: 'Which two crops were not ruined by the hail?',
        choices: ['Wheat and spelt', 'Barley and flax', 'Grapes and figs', 'Beans and lentils'],
        correctIndex: 0,
        explanation:
          'The barley and the flax were ruined, but the wheat and spelt were not, because they ripen later.',
      },
      {
        type: 'choice',
        question: 'What did Pharaoh say during the hail?',
        choices: [
          'This time I have sinned; the LORD is in the right',
          'I have done nothing wrong',
          'Send more',
          'He said nothing',
        ],
        correctIndex: 0,
        explanation: 'But when the hail stopped he sinned again and hardened his heart.',
      },
    ],
  },
  {
    book: 2,
    chapter: 10,
    summary:
      'The eighth plague is locusts. When his own officials plead, "Do you not yet realise that Egypt is ruined?" Pharaoh calls Moses — but attaches a condition: only the men may go. Moses refuses, and they are driven out. The locusts come and eat everything the hail had left. The ninth plague is darkness: for three days it is so dark that no one can get up, yet there is light where the Israelites live. Pharaoh says, "Leave your flocks and herds," and Moses answers that not one hoof can be left behind. Pharaoh tells him never to appear before him again.',
    questions: [
      {
        type: 'choice',
        question: 'What was the eighth plague?',
        choices: ['Locusts', 'Darkness', 'Hail', 'Frogs'],
        correctIndex: 0,
        explanation: 'An east wind brought the locusts, and they ate everything the hail had left.',
      },
      {
        type: 'choice',
        question: 'What did Pharaoh’s officials say?',
        choices: [
          'Do you not yet realise that Egypt is ruined?',
          'Hold out longer',
          'Kill Moses',
          'They said nothing',
        ],
        correctIndex: 0,
        explanation: 'His own officials were the first to urge him to let the people go and serve the LORD.',
      },
      {
        type: 'choice',
        question: 'What was it like where the Israelites lived during the ninth plague?',
        choices: ['There was light', 'It was even darker', 'It was just as dark', 'There was fire'],
        correctIndex: 0,
        explanation:
          'For three days there was thick darkness over Egypt, but the Israelites had light where they lived.',
      },
      {
        type: 'choice',
        question: 'What was Pharaoh’s first condition?',
        choices: [
          'Only the men may go and worship',
          'All of you go',
          'Take only the livestock',
          'Go for three days only',
        ],
        correctIndex: 0,
        explanation:
          'Moses answered that they would go with their young and their old, their sons and daughters, their flocks and herds.',
      },
      {
        type: 'choice',
        question: 'What condition did Pharaoh set after the darkness?',
        choices: [
          'Leave your flocks and herds behind',
          'Only the men may go',
          'Come back within three days',
          'Pay money',
        ],
        correctIndex: 0,
        explanation:
          'Moses refused: not a hoof could be left, because they did not yet know what they would need to offer.',
      },
      {
        type: 'choice',
        question: 'How many days did the darkness last?',
        choices: ['Three days', 'Seven days', 'One day', 'Forty days'],
        correctIndex: 0,
        explanation: 'For three days no one could see anyone else or get up from where they were.',
      },
      {
        type: 'choice',
        question: 'What were Pharaoh’s last words to Moses?',
        choices: [
          'Never appear before me again; the day you see my face you will die',
          'Go in peace',
          'Come back tomorrow',
          'I forgive you',
        ],
        correctIndex: 0,
        explanation: 'Moses answered, "As you say — I will never appear before you again."',
      },
    ],
  },
  {
    book: 2,
    chapter: 11,
    summary:
      'The last plague is announced. God says that after one more plague Pharaoh will certainly let them go. He tells the Israelites to ask their neighbours for articles of silver and gold, and makes the Egyptians favourable toward them. Moses declares to Pharaoh that at midnight every firstborn in Egypt will die — from the firstborn of Pharaoh on his throne to the firstborn of the slave girl at her hand mill, and the firstborn of the cattle as well. But among the Israelites not even a dog will bark. Moses leaves Pharaoh in hot anger.',
    questions: [
      {
        type: 'choice',
        question: 'What was the last plague that was announced?',
        choices: ['The death of every firstborn in Egypt', 'A great earthquake', 'A flood', 'A disease'],
        correctIndex: 0,
        explanation:
          'Every firstborn would die, from Pharaoh’s son to the slave girl’s son, and the firstborn of the livestock too.',
      },
      {
        type: 'choice',
        question: 'What was said about the Israelites?',
        choices: [
          'Not even a dog would bark at them',
          'They would die the same way',
          'There would be a great noise',
          'It was not said',
        ],
        correctIndex: 0,
        explanation: 'It was so they would know that the LORD makes a distinction between Egypt and Israel.',
      },
      {
        type: 'choice',
        question: 'What did God tell the Israelites to ask for?',
        choices: ['Articles of silver and gold from their neighbours', 'Food', 'Clothing', 'Livestock'],
        correctIndex: 0,
        explanation:
          'The LORD made the Egyptians favourable toward the people, and they gave them what they asked for.',
      },
      {
        type: 'choice',
        question: 'At what hour was this plague to happen?',
        choices: ['About midnight', 'Dawn', 'Midday', 'Evening'],
        correctIndex: 0,
        explanation: 'God said, "About midnight I will go throughout Egypt."',
      },
      {
        type: 'choice',
        question: 'How did Moses leave Pharaoh?',
        choices: ['In hot anger', 'Rejoicing', 'Quietly', 'Weeping'],
        correctIndex: 0,
        explanation: 'After saying this, Moses went out from Pharaoh in hot anger.',
      },
      {
        type: 'choice',
        question: 'How was Moses regarded in the land of Egypt?',
        choices: [
          'He was highly regarded by Pharaoh’s officials and by the people',
          'He was thought of as nobody',
          'No one knew him',
          'He was only hated',
        ],
        correctIndex: 0,
        explanation:
          'It says Moses himself was highly regarded in Egypt by Pharaoh’s officials and by the people.',
      },
      {
        type: 'choice',
        question: 'What did God say Pharaoh would do after this plague?',
        choices: [
          'He would let them go, and even drive them out completely',
          'He would never let them go',
          'He would let only half of them go',
          'He would let them go in three days',
        ],
        correctIndex: 0,
        explanation: 'God said, "He will let you go from here, and will drive you out completely."',
      },
    ],
  },
  {
    book: 2,
    chapter: 12,
    summary:
      'The Passover begins. Each household takes a year-old lamb without defect, kills it at twilight on the fourteenth day, and puts its blood on the two doorposts and the lintel. That night, when God strikes Egypt, He sees the blood and passes over that house. The meat is roasted and eaten in haste with unleavened bread and bitter herbs, with belts fastened, sandals on and staff in hand. At midnight there is a great cry throughout Egypt, and that very night Pharaoh calls Moses and tells them to go. Israel leaves Egypt after four hundred and thirty years.',
    questions: [
      {
        type: 'choice',
        question: 'What was put on the two doorposts and the lintel?',
        choices: ['The blood of the lamb', 'Oil', 'Water', 'Ashes'],
        correctIndex: 0,
        explanation:
          '"When I see the blood, I will pass over you" — that is where the name Passover comes from.',
      },
      {
        type: 'choice',
        question: 'What kind of animal did the Passover lamb have to be?',
        choices: ['A year-old male without defect', 'The biggest one', 'Any animal at all', 'An old sheep'],
        correctIndex: 0,
        explanation:
          'It could be taken from the sheep or the goats, but had to be a year-old male without defect.',
      },
      {
        type: 'choice',
        question: 'How were they told to eat the meal?',
        choices: [
          'With belts fastened, sandals on and staff in hand, eating in haste',
          'Sitting down and eating slowly',
          'Lying down to eat',
          'It did not matter',
        ],
        correctIndex: 0,
        explanation: 'They were dressed to leave at any moment. This, God said, is the LORD’s Passover.',
      },
      {
        type: 'choice',
        question: 'How many years did the Israelites live in Egypt?',
        choices: [
          'Four hundred and thirty years',
          'Four hundred years',
          'Forty years',
          'Two hundred and ten years',
        ],
        correctIndex: 0,
        explanation:
          'On the very day the four hundred and thirty years ended, the LORD’s divisions left Egypt.',
      },
      {
        type: 'choice',
        question: 'Why did they eat unleavened bread?',
        choices: [
          'They left in such haste that the dough had no time to rise',
          'It tasted better',
          'It was cheaper',
          'It kept longer',
        ],
        correctIndex: 0,
        explanation: 'They were driven out of Egypt and could not delay, so they baked bread without yeast.',
      },
      {
        type: 'choice',
        question: 'What happened in Egypt at midnight?',
        choices: [
          'Every firstborn died, and there was a great cry',
          'An earthquake struck',
          'A fire broke out',
          'Nothing happened',
        ],
        correctIndex: 0,
        explanation: 'There was loud wailing in Egypt, for there was not a house without someone dead.',
      },
      {
        type: 'choice',
        question: 'What did God command concerning the Passover?',
        choices: [
          'Keep it for the generations to come as a lasting ordinance',
          'Keep it only once',
          'Forget it',
          'Keep it only in Egypt',
        ],
        correctIndex: 0,
        explanation:
          'When children ask, "What does this ceremony mean?" they were to answer that it is the Passover sacrifice to the LORD.',
      },
    ],
  },
  {
    book: 2,
    chapter: 13,
    summary:
      'God tells them to consecrate the firstborn: every firstborn, human or animal, belongs to Him. He also has them keep the Feast of Unleavened Bread, and says that when their children ask, they are to tell the story of how God brought them out of Egypt. Remembering does not happen by itself; it has to be handed on as a story. When the people left, God did not lead them by the short road through Philistine country, in case the sight of war made them turn back to Egypt. Moses carried Joseph’s bones out with him, and God led them by a pillar of cloud by day and a pillar of fire by night.',
    questions: [
      {
        type: 'choice',
        question: 'How did God lead the people by day and by night?',
        choices: [
          'A pillar of cloud by day and a pillar of fire by night',
          'An angel',
          'A star',
          'Moses’ staff',
        ],
        correctIndex: 0,
        explanation:
          'Neither the pillar of cloud nor the pillar of fire left its place in front of the people.',
      },
      {
        type: 'choice',
        question: 'Why did God not lead them by the short Philistine road?',
        choices: [
          'In case they saw war, changed their minds and went back to Egypt',
          'Because the road was narrow',
          'Because there was no water',
          'Only because there were many enemies',
        ],
        correctIndex: 0,
        explanation: 'It is a place that shows the fastest road is not always the best one.',
      },
      {
        type: 'choice',
        question: 'Whose bones did Moses carry out of Egypt?',
        choices: ['Joseph', 'Jacob', 'Aaron', 'Levi'],
        correctIndex: 0,
        explanation: 'The oath Joseph made them swear in Genesis 50 is kept here.',
      },
      {
        type: 'choice',
        question: 'What were they to tell their children when they asked?',
        choices: [
          'How the LORD brought them out of Egypt with a mighty hand',
          'The names of their ancestors',
          'The size of the land',
          'The history of the kings',
        ],
        correctIndex: 0,
        explanation:
          'The reason for keeping the ordinance was to be handed on as a story. Memory has to be passed from one generation to the next.',
      },
      {
        type: 'choice',
        question: 'What was the rule about the firstborn?',
        choices: [
          'Every firstborn, human or animal, is mine; consecrate it',
          'Sell them all',
          'Keep them at home',
          'Give them to a neighbour',
        ],
        correctIndex: 0,
        explanation:
          'It was an ordinance to keep them remembering the day God struck the firstborn of Egypt.',
      },
      {
        type: 'choice',
        question: 'How long is the Feast of Unleavened Bread?',
        choices: ['Seven days', 'Three days', 'One day', 'A month'],
        correctIndex: 0,
        explanation:
          'They were to eat unleavened bread for seven days and hold a festival to the LORD on the seventh.',
      },
      {
        type: 'choice',
        question: 'By the wilderness road toward which sea did Israel go out?',
        choices: ['The Red Sea', 'The Great Sea', 'The Jordan', 'The Sea of Galilee'],
        correctIndex: 0,
        explanation: 'God led the people around by the desert road toward the Red Sea.',
      },
    ],
  },
  {
    book: 2,
    chapter: 14,
    summary:
      'Pharaoh changes his mind and comes after them with his chariots. The sea is in front of them and the Egyptian army behind. The people are terrified and blame Moses: "Was it because there were no graves in Egypt that you brought us out here to die?" Moses answers, "Do not be afraid. Stand firm and you will see the deliverance the LORD will bring you today. The LORD will fight for you; you need only be still." Moses stretches out his hand, an east wind blows all night and the sea divides. Israel crosses on dry ground, and the pursuing army is covered by the sea.',
    questions: [
      {
        type: 'choice',
        question: '"The LORD will fight for you; you need only be ____." Fill in the blank.',
        choices: ['Still', 'Standing firm', 'Silent', 'Waiting'],
        correctIndex: 0,
        explanation:
          'He said it with the sea in front and an army behind — a place where people could do nothing.',
      },
      {
        type: 'choice',
        question: 'What did the frightened people say to Moses?',
        choices: [
          'Was it because there were no graves in Egypt that you brought us out to die?',
          'Let us go forward',
          'Let us fight',
          'Let us pray',
        ],
        correctIndex: 0,
        explanation:
          'They even said it would have been better to serve the Egyptians than to die in the desert.',
      },
      {
        type: 'choice',
        question: 'How was the sea divided?',
        choices: [
          'Moses stretched out his hand and a strong east wind blew all night, driving the sea back',
          'It split all at once',
          'They built boats and crossed',
          'It froze over',
        ],
        correctIndex: 0,
        explanation:
          'All that night the LORD drove the sea back with a strong east wind, and the waters were divided.',
      },
      {
        type: 'choice',
        question: 'What stood between Israel and the Egyptian army?',
        choices: [
          'The pillar of cloud moved behind them so neither side came near the other all night',
          'A wall of fire',
          'A great rock',
          'Nothing at all',
        ],
        correctIndex: 0,
        explanation:
          'There was cloud and darkness over the Egyptian camp, while the Israelite camp had light.',
      },
      {
        type: 'choice',
        question: 'What did the Egyptian army say in the middle of the sea?',
        choices: [
          'Let us flee from Israel; the LORD is fighting for them',
          'Let us press on',
          'Let us surrender',
          'They said nothing',
        ],
        correctIndex: 0,
        explanation: 'They realised it when their chariot wheels came off and driving became difficult.',
      },
      {
        type: 'choice',
        question: 'What did the people do afterwards?',
        choices: [
          'They feared the LORD and trusted in Him and in Moses His servant',
          'They forgot at once',
          'They turned back',
          'They started a fight',
        ],
        correctIndex: 0,
        explanation:
          'When Israel saw the great power the LORD used against the Egyptians, they feared the LORD.',
      },
      {
        type: 'choice',
        question: 'What was the ground like where Israel crossed the sea?',
        choices: ['Dry ground', 'Mud', 'Sand', 'Shallow water'],
        correctIndex: 0,
        explanation:
          'The waters were a wall on their right and on their left, and the Israelites went through the sea on dry ground.',
      },
    ],
  },
  {
    book: 2,
    chapter: 15,
    summary:
      'Safe on the far side, Israel sings: "The LORD is my strength and my song; he has become my salvation." What God did at the sea is set down as a song. Miriam, Aaron’s sister, takes a tambourine and answers with the women, dancing. But three days later they reach Marah and the water is too bitter to drink, and the people grumble at once. Moses cries out, God shows him a piece of wood, and when he throws it in the water turns sweet. There God makes a decree and says, "I am the LORD, who heals you." Then they come to Elim, with twelve springs and seventy palm trees.',
    questions: [
      {
        type: 'choice',
        question: '"The LORD is my strength and my ____; he has become my salvation."',
        choices: ['Song', 'Shield', 'Stronghold', 'Light'],
        correctIndex: 0,
        explanation:
          'It is a line from the song they sang after crossing the Red Sea. The first response of rescued people was a song.',
      },
      {
        type: 'choice',
        question: 'Who took a tambourine and answered with the women?',
        choices: ['Miriam', 'Zipporah', 'Jochebed', 'Deborah'],
        correctIndex: 0,
        explanation:
          'Miriam the prophet, Aaron’s sister, took a tambourine, and all the women followed her with dancing.',
      },
      {
        type: 'choice',
        question: 'What was the name of the place where the water was too bitter to drink?',
        choices: ['Marah', 'Elim', 'The Desert of Sin', 'Rephidim'],
        correctIndex: 0,
        explanation: 'It was called Marah, which means "bitter," because the water there was bitter.',
      },
      {
        type: 'choice',
        question: 'How did the water at Marah become sweet?',
        choices: [
          'Moses threw in a piece of wood God showed him',
          'It rained',
          'They dug a well',
          'They waited',
        ],
        correctIndex: 0,
        explanation:
          'The LORD showed Moses a piece of wood; he threw it into the water and the water became fit to drink.',
      },
      {
        type: 'choice',
        question: 'How did God describe Himself at Marah?',
        choices: [
          'I am the LORD, who heals you',
          'I am God Almighty',
          'I am the Holy God',
          'I am a jealous God',
        ],
        correctIndex: 0,
        explanation:
          'He said that if they listened and kept His decrees He would not bring on them the diseases He brought on the Egyptians.',
      },
      {
        type: 'choice',
        question: 'What was at Elim?',
        choices: ['Twelve springs and seventy palm trees', 'A great city', 'Wide fields', 'Nothing at all'],
        correctIndex: 0,
        explanation: 'They camped there beside the water.',
      },
      {
        type: 'choice',
        question: 'How long after crossing the Red Sea did the water trouble come?',
        choices: ['Three days', 'One day', 'Seven days', 'A month'],
        correctIndex: 0,
        explanation: 'They went into the Desert of Shur and travelled three days without finding water.',
      },
    ],
  },
  {
    book: 2,
    chapter: 16,
    summary:
      'In the Desert of Sin the people grumble again: "If only we had died in Egypt, where we sat round pots of meat and ate all the bread we wanted." God says He will rain bread from heaven. In the evening quail cover the camp, and in the morning, when the dew is gone, thin flakes are left on the ground. The people ask, "What is it?" — so it is called manna. They were to gather only what they needed for the day, and twice as much on the sixth day. Some kept it anyway and it bred worms, and some went out to gather on the Sabbath. The manna fell for forty years.',
    questions: [
      {
        type: 'choice',
        question: 'What was the food called, from the question "What is it?"',
        choices: ['Manna', 'Quail', 'Unleavened bread', 'Loaves'],
        correctIndex: 0,
        explanation: 'It was white like coriander seed and tasted like wafers made with honey.',
      },
      {
        type: 'choice',
        question: 'What was the rule for gathering manna?',
        choices: [
          'Only as much as each needed for that day, and twice as much on the sixth day',
          'The more the better',
          'Once a week',
          'Do not gather it',
        ],
        correctIndex: 0,
        explanation:
          'What was kept over bred worms and smelled, but what they gathered on the sixth day did not spoil over the Sabbath.',
      },
      {
        type: 'choice',
        question: 'What covered the camp in the evening?',
        choices: ['Quail', 'Dew', 'Snow', 'Sand'],
        correctIndex: 0,
        explanation: 'In the evening quail came and covered the camp, and in the morning there was manna.',
      },
      {
        type: 'choice',
        question: 'What did the people long for as they grumbled?',
        choices: [
          'The pots of meat in Egypt and all the bread they could eat',
          'Their houses in Egypt',
          'Their clothes in Egypt',
          'Their friends in Egypt',
        ],
        correctIndex: 0,
        explanation:
          'Remembering the place of slavery fondly is something that keeps happening in the wilderness.',
      },
      {
        type: 'choice',
        question: 'What happened when they measured what they had gathered?',
        choices: [
          'Whoever gathered much had nothing left over, and whoever gathered little had no lack',
          'Those who gathered much had extra',
          'Those who gathered little went hungry',
          'Everyone had leftovers',
        ],
        correctIndex: 0,
        explanation: 'Each one gathered as much as he needed. That was how their needs were met.',
      },
      {
        type: 'choice',
        question: 'For how many years did the manna fall?',
        choices: ['Forty years', 'Seven years', 'Three years', 'Ten years'],
        correctIndex: 0,
        explanation: 'They ate manna forty years, until they came to a land that was settled.',
      },
      {
        type: 'choice',
        question: 'What was the rule about the Sabbath?',
        choices: [
          'There would be no manna on the seventh day, so no one was to go out',
          'Gather double',
          'Gather as usual',
          'There was no rule',
        ],
        correctIndex: 0,
        explanation:
          'Some went out to gather anyway, and God asked how long they would refuse to keep His commands.',
      },
    ],
  },
  {
    book: 2,
    chapter: 17,
    summary:
      'At Rephidim there is no water to drink, and the people quarrel with Moses: "Why did you bring us out of Egypt to make us die of thirst?" Moses cries out, "They are almost ready to stone me." God tells him to strike the rock at Horeb, and water comes out. The place is named Massah and Meribah. Then the Amalekites come and attack. Whenever Moses held up his hands on the hilltop Israel prevailed, and whenever he lowered them Amalek prevailed. When his hands grew heavy, Aaron and Hur held them up, one on each side, until sunset. Moses built an altar and called it The LORD is my Banner.',
    questions: [
      {
        type: 'choice',
        question: 'How did water come at Rephidim?',
        choices: [
          'Moses struck the rock at Horeb with his staff',
          'They dug a well',
          'It rained',
          'They collected dew',
        ],
        correctIndex: 0,
        explanation:
          'God said He would stand on the rock; Moses struck it, water came out and the people drank.',
      },
      {
        type: 'choice',
        question: 'What did Moses name the altar he built?',
        choices: ['The LORD is my Banner', 'The LORD Will Provide', 'The LORD is Peace', 'El-Elohe-Israel'],
        correctIndex: 0,
        explanation: 'The name means "the LORD is my banner."',
      },
      {
        type: 'choice',
        question: 'What decided the battle against Amalek?',
        choices: [
          'Whether Moses held up his hands',
          'The number of soldiers',
          'How good the weapons were',
          'The weather',
        ],
        correctIndex: 0,
        explanation: 'When his hands were up Israel prevailed; when they came down Amalek prevailed.',
      },
      {
        type: 'choice',
        question: 'Which two men held up Moses’ hands?',
        choices: ['Aaron and Hur', 'Joshua and Caleb', 'Aaron and Miriam', 'Jethro and Hur'],
        correctIndex: 0,
        explanation:
          'The two of them held his hands up, one on each side, so that they stayed steady till sunset.',
      },
      {
        type: 'choice',
        question: 'Who led Israel in the fight against Amalek?',
        choices: ['Joshua', 'Aaron', 'Hur', 'Caleb'],
        correctIndex: 0,
        explanation:
          'Moses told Joshua to choose men and go out to fight. It is the first time Joshua appears.',
      },
      {
        type: 'choice',
        question: 'Why was the place called Massah and Meribah?',
        choices: [
          'Because the people quarrelled and tested the LORD',
          'Because the water was sweet',
          'Because they won the battle',
          'Because the road was hard',
        ],
        correctIndex: 0,
        explanation: 'It was because they tested Him, saying, "Is the LORD among us or not?"',
      },
      {
        type: 'choice',
        question: 'What did Moses cry out?',
        choices: ['They are almost ready to stone me', 'Give us water', 'Show us the way', 'Let us rest'],
        correctIndex: 0,
        explanation: 'The mood was rough enough that the leader himself felt threatened.',
      },
    ],
  },
  {
    book: 2,
    chapter: 18,
    summary:
      'Jethro, Moses’ father-in-law, comes bringing Zipporah and her two sons. When Moses tells him everything God has done, Jethro rejoices, says, "Now I know that the LORD is greater than all other gods," and offers sacrifices. The next day Jethro watches Moses judge the people alone from morning till evening, and says, "The work is too heavy for you; you cannot handle it alone." Then he gives him a plan: appoint men who fear God, are trustworthy and hate dishonest gain, as officials over thousands, hundreds, fifties and tens, and let only the hard cases come to Moses. Moses listened to him.',
    questions: [
      {
        type: 'choice',
        question: 'What was the name of the father-in-law who came to Moses?',
        choices: ['Jethro', 'Aaron', 'Hur', 'Bethuel'],
        correctIndex: 0,
        explanation: 'Jethro, the priest of Midian, brought Moses’ wife and his two sons.',
      },
      {
        type: 'choice',
        question: 'What problem did Jethro point out to Moses?',
        choices: [
          'That doing all the judging alone would wear him out',
          'That the judgements were unfair',
          'That the people were lazy',
          'That the road was long',
        ],
        correctIndex: 0,
        explanation:
          'He said, "You and these people will only wear yourselves out; the work is too heavy for you."',
      },
      {
        type: 'choice',
        question: 'What qualities did Jethro say the appointed men should have?',
        choices: [
          'Men who fear God, are trustworthy and hate dishonest gain',
          'The oldest men',
          'The richest men',
          'The strongest men',
        ],
        correctIndex: 0,
        explanation: 'The standard looks first at what kind of person a man is, not only at what he can do.',
      },
      {
        type: 'choice',
        question: 'How was the organisation divided?',
        choices: [
          'Officials over thousands, hundreds, fifties and tens',
          'The twelve tribes',
          'Four groups by direction',
          'Elders and people',
        ],
        correctIndex: 0,
        explanation: 'They judged the simple cases themselves, and only the hard ones went to Moses.',
      },
      {
        type: 'choice',
        question: 'What did Jethro say after hearing Moses’ account?',
        choices: [
          'Now I know that the LORD is greater than all other gods',
          'Well done',
          'Let us go back',
          'That is hard to believe',
        ],
        correctIndex: 0,
        explanation: 'Jethro was delighted, praised God, and brought a burnt offering and sacrifices.',
      },
      {
        type: 'choice',
        question: 'What did Moses do with his father-in-law’s advice?',
        choices: ['He listened and did everything he said', 'He refused', 'He put it off', 'He was angry'],
        correctIndex: 0,
        explanation: 'It is a scene of a leader taking advice. Moses appointed the men just as Jethro said.',
      },
      {
        type: 'choice',
        question: 'What was the name of Moses’ elder son?',
        choices: ['Gershom', 'Eliezer', 'Nadab', 'Abihu'],
        correctIndex: 0,
        explanation:
          'He was called Gershom, "I have become a foreigner in a foreign land," and the second was Eliezer, "my father’s God was my helper."',
      },
    ],
  },
  {
    book: 2,
    chapter: 19,
    summary:
      'Three months to the day after leaving Egypt they reach the Desert of Sinai. God calls from the mountain: "You yourselves have seen what I did to Egypt, and how I carried you on eagles’ wings and brought you to myself." If they keep the covenant they will be His treasured possession out of all nations, a kingdom of priests. The people answer, "We will do everything the LORD has said." They are to prepare for three days and wash their clothes, and a boundary is set round the mountain so no one may go up. On the third morning there is thunder and lightning, a thick cloud and a very loud trumpet blast.',
    questions: [
      {
        type: 'choice',
        question: 'What did God compare the bringing out of Egypt to?',
        choices: [
          'Carrying them on eagles’ wings',
          'Ferrying them by boat',
          'Bringing them in wagons',
          'Opening a road',
        ],
        correctIndex: 0,
        explanation: '"I carried you on eagles’ wings and brought you to myself."',
      },
      {
        type: 'choice',
        question: 'What kind of nation did God say they would be if they kept the covenant?',
        choices: ['A kingdom of priests', 'A strong nation', 'A great people', 'A blessed city'],
        correctIndex: 0,
        explanation:
          'The whole earth is God’s, yet Israel would be His treasured possession, a kingdom of priests and a holy nation.',
      },
      {
        type: 'choice',
        question: 'What did the people answer?',
        choices: [
          'We will do everything the LORD has said',
          'We will think about it',
          'That is too hard',
          'They gave no answer',
        ],
        correctIndex: 0,
        explanation:
          'Moses brought their answer back to the LORD. How this promise is kept becomes one of the Bible’s great themes.',
      },
      {
        type: 'choice',
        question: 'What preparation did God command before He came down?',
        choices: [
          'Consecrate themselves for three days and wash their clothes',
          'Fast',
          'Prepare offerings',
          'No preparation at all',
        ],
        correctIndex: 0,
        explanation:
          'It was preparation for standing before a holy God. A boundary was set round the mountain as well.',
      },
      {
        type: 'choice',
        question: 'What happened on the morning of the third day?',
        choices: [
          'Thunder and lightning, a thick cloud and a loud trumpet blast',
          'It was quiet',
          'It rained',
          'The sun shone brightly',
        ],
        correctIndex: 0,
        explanation: 'Everyone in the camp trembled, and Mount Sinai was covered with smoke.',
      },
      {
        type: 'choice',
        question: 'How many months after leaving Egypt did Israel reach the Desert of Sinai?',
        choices: ['Three months', 'One month', 'Seven months', 'A year'],
        correctIndex: 0,
        explanation: 'They came to the Desert of Sinai three months to the day after leaving Egypt.',
      },
      {
        type: 'choice',
        question: 'Why was a boundary set round the mountain?',
        choices: [
          'So that no one would go up it or cross the limit',
          'To mark the road',
          'To keep animals out',
          'To divide the camp',
        ],
        correctIndex: 0,
        explanation: 'Holiness was stressed so strongly that anyone who crossed it was to be put to death.',
      },
    ],
  },
  {
    book: 2,
    chapter: 20,
    summary:
      'The Ten Commandments are given. God first says who He is: "I am the LORD your God, who brought you out of Egypt, out of the land of slavery." Relationship comes before rules. The first four commandments face God — no other gods, no idols, do not misuse His name, keep the Sabbath holy. The last six face people — honour your parents, do not murder, commit adultery, steal or give false testimony, and do not covet what belongs to your neighbour. The people tremble at the thunder and the trumpet, stand far off, and ask Moses to speak to them instead.',
    questions: [
      {
        type: 'choice',
        question: 'What is the first commandment?',
        choices: [
          'You shall have no other gods before me',
          'You shall not make an idol',
          'Remember the Sabbath day',
          'Honour your father and mother',
        ],
        correctIndex: 0,
        explanation: 'The relationship with God stands in first place among the ten.',
      },
      {
        type: 'choice',
        question: 'What did God say before the commandments began?',
        choices: [
          'I am the LORD your God, who brought you out of Egypt, out of the land of slavery',
          'You are my servants',
          'Listen to me',
          'Be afraid',
        ],
        correctIndex: 0,
        explanation: 'Who is speaking comes before what to do. Rescue first, commandments after.',
      },
      {
        type: 'choice',
        question: 'What is the fourth commandment about?',
        choices: ['The Sabbath', 'Honouring parents', 'Murder', 'Stealing'],
        correctIndex: 0,
        explanation:
          'Work six days and rest on the seventh — and the reason given is the seven days of creation.',
      },
      {
        type: 'choice',
        question: 'Which commandment has a promise attached to it?',
        choices: [
          'Honour your father and mother — that you may live long',
          'Do not murder',
          'Do not steal',
          'Do not covet',
        ],
        correctIndex: 0,
        explanation:
          'It carries the promise, "that you may live long in the land the LORD your God is giving you."',
      },
      {
        type: 'choice',
        question: 'What is the tenth and last commandment?',
        choices: [
          'Do not covet what belongs to your neighbour',
          'Do not give false testimony',
          'Do not commit adultery',
          'Do not make idols',
        ],
        correctIndex: 0,
        explanation:
          'It stands out because it deals not only with what you do but with what is in your heart.',
      },
      {
        type: 'choice',
        question: 'What did the people do when they saw the thunder and heard the trumpet?',
        choices: [
          'They trembled, stood far off and asked Moses to speak for them',
          'They came closer',
          'They sang',
          'They scattered',
        ],
        correctIndex: 0,
        explanation:
          'Moses answered, "Do not be afraid. God has come to test you, so that the fear of God will be with you."',
      },
      {
        type: 'choice',
        question: 'How many commandments are there?',
        choices: ['Ten', 'Seven', 'Twelve', 'Five'],
        correctIndex: 0,
        explanation: 'The first four face God and the last six face other people.',
      },
    ],
  },
];
