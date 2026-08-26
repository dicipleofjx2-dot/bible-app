/**
 * Bible Reading Helper content (English) — Exodus 21–40
 *
 * Mirrors scripts/content/exodus-21-40.js chapter for chapter, question for
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
    chapter: 21,
    summary:
      'After the Ten Commandments come specific laws, and the first subject is servants. A Hebrew servant works six years and goes free in the seventh, paying nothing. No one may be owned for ever. Then come laws about violence and injury. The famous line "eye for eye, tooth for tooth" is here — not a command to pay back harder, but a **limit**: never take more than you suffered. If a master struck a servant and destroyed an eye or a tooth, he had to let that servant go free. Even a master could not do as he pleased.',
    questions: [
      {
        type: 'choice',
        question: 'After how many years could a Hebrew servant go free?',
        choices: ['Six years', 'Three years', 'Ten years', 'Never'],
        correctIndex: 0,
        explanation: 'He served six years, and in the seventh he went free, paying nothing.',
      },
      {
        type: 'choice',
        question: 'What does "eye for eye, tooth for tooth" really mean?',
        choices: [
          'A limit — never pay back more than you suffered',
          'A command to repay exactly the same',
          'Pay back double',
          'Do not pay back at all',
        ],
        correctIndex: 0,
        explanation:
          'It was a ceiling that kept revenge from growing without end. In the ancient world it was a step forward, not backward.',
      },
      {
        type: 'choice',
        question: 'What had to happen if a master struck a servant and destroyed an eye?',
        choices: [
          'He had to let the servant go free',
          'He had to pay compensation',
          'Nothing happened',
          'He paid a fine',
        ],
        correctIndex: 0,
        explanation:
          'Destroying an eye or a tooth cost him the servant. Even a servant had a body that had to be respected.',
      },
      {
        type: 'choice',
        question: 'What was the law about kidnapping and selling a person?',
        choices: [
          'He must be put to death',
          'He must pay a fine',
          'He must become a servant',
          'He must be banished',
        ],
        correctIndex: 0,
        explanation: 'Treating a person as goods to be bought and sold was dealt with most severely of all.',
      },
      {
        type: 'choice',
        question: 'What was the law for anyone who attacked or cursed his parents?',
        choices: ['He must be put to death', 'A fine', 'Banishment', 'No penalty'],
        correctIndex: 0,
        explanation:
          'It shows how heavily the fifth commandment — honour your parents — was weighted in actual law.',
      },
      {
        type: 'choice',
        question: 'If a servant loved his master and family and would not go free, what was marked?',
        choices: ['His ear', 'His hand', 'His forehead', 'His foot'],
        correctIndex: 0,
        explanation:
          'His ear was pierced with an awl against the door or doorpost, and he served that household for life.',
      },
      {
        type: 'choice',
        question: 'Where do these laws stand in the book?',
        choices: [
          'Right after the Ten Commandments',
          'After the building of the tabernacle',
          'Before crossing the Red Sea',
          'After entering Canaan',
        ],
        correctIndex: 0,
        explanation: 'The great principles come first, and then how to apply them in everyday life.',
      },
    ],
  },
  {
    book: 2,
    chapter: 22,
    summary:
      'This chapter deals with paying back what you have taken from someone. Steal and slaughter an ox and you repay five; a sheep, four. Start a fire that burns a neighbour’s grain and you must make it good. The second half is especially worth noticing: do not oppress a foreigner, do not harm a widow or an orphan, and do not charge interest when you lend to the poor. If you take a cloak as a pledge, return it before sunset — it is the only blanket that person has. God says, "When he cries out to me, I will hear, for I am compassionate."',
    questions: [
      {
        type: 'choice',
        question: 'What was the rule about a cloak taken as a pledge?',
        choices: [
          'Return it before sunset',
          'Return it after a month',
          'You need not return it',
          'You may sell it',
        ],
        correctIndex: 0,
        explanation: 'It is the only covering he has. God asks, "What else will he sleep in?"',
      },
      {
        type: 'choice',
        question: 'What was the rule about lending money to the poor?',
        choices: ['Charge no interest', 'Charge double interest', 'Take a pledge', 'Do not lend at all'],
        correctIndex: 0,
        explanation: 'Lending to someone in trouble was not to be turned into a way of making money.',
      },
      {
        type: 'choice',
        question: 'Who was singled out as not to be harmed?',
        choices: [
          'The foreigner, the widow and the orphan',
          'Kings and priests',
          'The rich and the merchants',
          'Soldiers',
        ],
        correctIndex: 0,
        explanation:
          'They are the people with no power to protect themselves. God says He Himself hears their cry.',
      },
      {
        type: 'choice',
        question: 'How many oxen had to be repaid for one stolen and slaughtered?',
        choices: ['Five', 'Four', 'Two', 'Seven'],
        correctIndex: 0,
        explanation: 'Five for an ox and four for a sheep.',
      },
      {
        type: 'choice',
        question: 'What reason was given for not oppressing a foreigner?',
        choices: [
          'Because you yourselves were foreigners in Egypt',
          'Because foreigners are strong',
          'Because the law says so',
          'No reason was given',
        ],
        correctIndex: 0,
        explanation:
          'Do not do to others what was done to you. This reason is repeated many times in the Bible.',
      },
      {
        type: 'choice',
        question: 'What did God say about widows and orphans?',
        choices: [
          'If they cry out to me, I will certainly hear them',
          'Let them fend for themselves',
          'Let the nation care for them',
          'He said nothing',
        ],
        correctIndex: 0,
        explanation: 'He even said His anger would burn against anyone who harmed them.',
      },
      {
        type: 'choice',
        question: 'What if a fire you started burned a neighbour’s grain?',
        choices: ['You must make full restitution', 'An apology is enough', 'No liability', 'Repay half'],
        correctIndex: 0,
        explanation: 'Even without intent, the fire was yours, so the responsibility was yours.',
      },
    ],
  },
  {
    book: 2,
    chapter: 23,
    summary:
      'Laws about justice and about the festivals. Do not spread false reports, and do not follow the crowd in doing wrong — do not be swept along in court just because most people are going that way. Nor may you favour a poor man simply because he is poor. There is even a line about leading back your enemy’s ox when it has wandered off. In the sabbath year the fields lie unworked so the poor may eat; on the Sabbath even servants and animals rest. Three festivals are to be kept each year, and at the end God promises to send an angel ahead to guard them on the way.',
    questions: [
      {
        type: 'choice',
        question: 'What warning is given about judging?',
        choices: [
          'Do not follow the crowd in doing wrong, and do not favour a poor man in his lawsuit',
          'Always follow the majority',
          'Always side with the poor',
          'Side with the rich',
        ],
        correctIndex: 0,
        explanation: 'Even sympathy can cloud judgement. The standard was the facts and justice.',
      },
      {
        type: 'choice',
        question: 'What if you see your enemy’s ox or donkey wandering off?',
        choices: ['Be sure to take it back to him', 'Pretend not to see', 'Keep it', 'Only tell the owner'],
        correctIndex: 0,
        explanation:
          'It even says that if you see the donkey of someone who hates you fallen under its load, you must help him with it.',
      },
      {
        type: 'choice',
        question: 'Why were the fields left unworked in the sabbath year?',
        choices: [
          'So the poor could eat, and the wild animals could have what was left',
          'Only so the land could rest',
          'Because farming was impossible',
          'To reduce taxes',
        ],
        correctIndex: 0,
        explanation:
          'Rest and sharing came together in this law. On the Sabbath even servants and animals rested.',
      },
      {
        type: 'choice',
        question: 'How many festivals were to be kept each year?',
        choices: ['Three', 'One', 'Two', 'Seven'],
        correctIndex: 0,
        explanation: 'Unleavened Bread, Harvest (Weeks) and Ingathering — three festivals every year.',
      },
      {
        type: 'choice',
        question: 'What did God say He would send to guard them on the way?',
        choices: ['An angel', 'A cloud', 'Fire', 'An army'],
        correctIndex: 0,
        explanation:
          '"I am sending an angel ahead of you to guard you along the way and to bring you to the place I have prepared."',
      },
      {
        type: 'choice',
        question: 'What warning is given about false testimony?',
        choices: [
          'Do not spread a false report, and do not join hands with the wicked as a malicious witness',
          'Do not testify at all',
          'Say only what you have heard',
          'There is no rule',
        ],
        correctIndex: 0,
        explanation: 'It points to words as the first place where justice breaks down.',
      },
      {
        type: 'choice',
        question: 'Why did God say He would not drive out the Canaanites all at once?',
        choices: [
          'So the land would not become desolate and the wild animals multiply',
          'Because they were strong',
          'Because there was no time',
          'No reason was given',
        ],
        correctIndex: 0,
        explanation:
          'He would drive them out little by little, until Israel had increased enough to take possession of the land.',
      },
    ],
  },
  {
    book: 2,
    chapter: 24,
    summary:
      'The covenant is formally made. When Moses tells the people all the LORD’s words they answer with one voice, "Everything the LORD has said we will do." Moses writes the words down, builds an altar in the morning and sets up twelve pillars. Young men offer sacrifices, and Moses sprinkles half the blood on the altar and half on the people, calling it "the blood of the covenant." Then Moses, Aaron, Nadab, Abihu and seventy elders go up, see God, and eat and drink. Moses goes up the mountain and stays forty days and forty nights.',
    questions: [
      {
        type: 'choice',
        question: 'What did the people answer when they heard the words?',
        choices: [
          'Everything the LORD has said we will do',
          'It is too hard',
          'We will think about it',
          'They gave no answer',
        ],
        correctIndex: 0,
        explanation: 'They answered with one voice, and Moses wrote down everything the LORD had said.',
      },
      {
        type: 'choice',
        question: 'What did Moses say as he sprinkled the blood?',
        choices: [
          'This is the blood of the covenant that the LORD has made with you',
          'This is the blood of atonement',
          'This is the blood of cleansing',
          'He said nothing',
        ],
        correctIndex: 0,
        explanation:
          'Half went on the altar and half on the people, showing that both sides were bound together.',
      },
      {
        type: 'choice',
        question: 'How many days did Moses stay on the mountain?',
        choices: ['Forty days', 'Seven days', 'Three days', 'Three months'],
        correctIndex: 0,
        explanation: 'Moses entered the cloud and stayed on the mountain forty days and forty nights.',
      },
      {
        type: 'choice',
        question: 'What did the twelve pillars Moses set up stand for?',
        choices: ['The twelve tribes of Israel', 'Twelve commandments', 'Twelve festivals', 'Twelve priests'],
        correctIndex: 0,
        explanation:
          'He built an altar at the foot of the mountain and set up twelve pillars for the twelve tribes of Israel.',
      },
      {
        type: 'choice',
        question: 'Who went up the mountain and saw God?',
        choices: [
          'Moses, Aaron, Nadab, Abihu and seventy elders of Israel',
          'Moses alone',
          'All the people',
          'Only the priests',
        ],
        correctIndex: 0,
        explanation:
          'It records that they saw God and ate and drank, and He did not raise His hand against them.',
      },
      {
        type: 'choice',
        question: 'How did the glory of the LORD look on the mountain?',
        choices: ['Like a consuming fire', 'Only like a bright light', 'It could not be seen', 'Like water'],
        correctIndex: 0,
        explanation:
          'To the Israelites the glory of the LORD looked like a consuming fire on top of the mountain.',
      },
      {
        type: 'choice',
        question: 'Which two men did Moses leave in charge when he went up?',
        choices: ['Aaron and Hur', 'Aaron and Joshua', 'Hur and Caleb', 'Nadab and Abihu'],
        correctIndex: 0,
        explanation:
          'He said, "Anyone involved in a dispute can go to them," and left matters with Aaron and Hur.',
      },
    ],
  },
  {
    book: 2,
    chapter: 25,
    summary:
      'The instructions for the tabernacle begin. First the offering, with one condition: "Receive it from everyone whose heart prompts them to give." Nothing was to be collected by force. Then the purpose of the whole project is put in one sentence: "Have them make a sanctuary for me, and I will dwell among them." God living among His people is the reason for the tabernacle. Then come the ark of the covenant, the table for the bread of the Presence, and the lampstand. Two cherubim are made at the two ends of the atonement cover, wings spread over it, and God says He will meet and speak there.',
    questions: [
      {
        type: 'choice',
        question: 'What was the purpose of building the tabernacle?',
        choices: [
          'So that God would dwell among them',
          'So that He could receive offerings',
          'So that the law could be kept there',
          'So that the people could gather',
        ],
        correctIndex: 0,
        explanation:
          '"Have them make a sanctuary for me, and I will dwell among them." The building was not the point; His presence was.',
      },
      {
        type: 'choice',
        question: 'What was the rule for receiving the offering?',
        choices: [
          'Receive it from everyone whose heart prompts them to give',
          'Collect the same from everyone',
          'Take it only from the rich',
          'Set a fixed amount for each',
        ],
        correctIndex: 0,
        explanation:
          'A willing heart was the condition. Chapters 35 and 36 show how that worked out in practice.',
      },
      {
        type: 'choice',
        question: 'What was to be put inside the ark?',
        choices: ['The tablets of the covenant law', 'Manna', 'A staff', 'Oil'],
        correctIndex: 0,
        explanation: 'God said, "Put in the ark the tablets of the covenant law, which I will give you."',
      },
      {
        type: 'choice',
        question: 'What was made at the two ends of the atonement cover?',
        choices: ['Two cherubim', 'Two pillars', 'Two lamps', 'Two trumpets'],
        correctIndex: 0,
        explanation:
          'Two cherubim of gold, with wings spread over the cover and their faces toward each other.',
      },
      {
        type: 'choice',
        question: 'Where did God say He would meet and speak with Moses?',
        choices: [
          'Above the atonement cover, between the two cherubim',
          'On the altar',
          'At the entrance to the tabernacle',
          'On the mountaintop',
        ],
        correctIndex: 0,
        explanation:
          '"There, above the cover between the two cherubim, I will meet with you and give you my commands."',
      },
      {
        type: 'choice',
        question: 'How many lamps did the lampstand hold?',
        choices: ['Seven', 'Three', 'Twelve', 'Five'],
        correctIndex: 0,
        explanation:
          'The lampstand was hammered out of pure gold, with seven lamps set up to light the space in front of it.',
      },
      {
        type: 'choice',
        question: 'According to what were all these things to be made?',
        choices: [
          'The pattern shown on the mountain',
          'Whatever people thought best',
          'The Egyptian style',
          'As expensively as possible',
        ],
        correctIndex: 0,
        explanation:
          '"See that you make them according to the pattern shown you on the mountain." It was not designed by people.',
      },
    ],
  },
  {
    book: 2,
    chapter: 26,
    summary:
      'How to make the tabernacle itself. Ten curtains of fine linen with cherubim worked into them, then a covering of goat hair, and over that ram skins and durable leather. The inside was beautiful and the outside plain. Frames of acacia wood are set into silver bases to form the walls. The most important part is the curtain: worked with cherubim in blue, purple and scarlet yarn, it divides the Holy Place from the Most Holy Place, with the ark of the covenant behind it. A place is created that not just anyone may enter. Because the tabernacle travelled, every part was made to be taken apart.',
    questions: [
      {
        type: 'choice',
        question: 'What divided the Holy Place from the Most Holy Place?',
        choices: ['A curtain', 'Wooden frames', 'A door', 'A stone wall'],
        correctIndex: 0,
        explanation:
          'A curtain of blue, purple and scarlet yarn and fine linen, with cherubim skilfully worked into it.',
      },
      {
        type: 'choice',
        question: 'What was placed behind the curtain, in the Most Holy Place?',
        choices: [
          'The ark of the covenant law',
          'The lampstand',
          'The table of the bread',
          'The altar of incense',
        ],
        correctIndex: 0,
        explanation:
          'The ark was placed behind the curtain, which separated the Holy Place from the Most Holy Place.',
      },
      {
        type: 'choice',
        question: 'How many layers made up the covering of the tabernacle?',
        choices: ['Four', 'One', 'Two', 'Six'],
        correctIndex: 0,
        explanation:
          'Fine linen curtains, goat-hair curtains, ram skins dyed red, and durable leather — beautiful inside, plain outside.',
      },
      {
        type: 'choice',
        question: 'What wood were the frames made of?',
        choices: ['Acacia', 'Cypress', 'Cedar', 'Olive wood'],
        correctIndex: 0,
        explanation: 'The frames were made of acacia wood, overlaid with gold and set into silver bases.',
      },
      {
        type: 'choice',
        question: 'Why was the tabernacle built to be taken apart?',
        choices: [
          'Because it had to be set up and taken down as they moved through the wilderness',
          'Because materials were short',
          'Because there was no time',
          'Only to make it lighter',
        ],
        correctIndex: 0,
        explanation:
          'Frames, crossbars and bases all fitted together and came apart. It also meant that God moved with them.',
      },
      {
        type: 'choice',
        question: 'What was hung at the entrance to the tabernacle?',
        choices: [
          'A curtain embroidered with blue, purple and scarlet yarn and fine linen',
          'A wooden door',
          'A gate of gold',
          'Nothing at all',
        ],
        correctIndex: 0,
        explanation: 'A curtain hung at the entrance, on five posts set into bronze bases.',
      },
      {
        type: 'choice',
        question: 'What standard keeps coming up in these instructions?',
        choices: [
          'Make it exactly according to the pattern shown',
          'Make it as large as possible',
          'Make it cheaply',
          'Make it quickly',
        ],
        correctIndex: 0,
        explanation:
          'Measurements and materials are set out in detail. Worship was not for people to design.',
      },
    ],
  },
  {
    book: 2,
    chapter: 27,
    summary:
      'The things that stand in the courtyard. First the altar of burnt offering, made of acacia wood and overlaid with bronze, with horns at its four corners, and pots, shovels and basins of bronze as well. This altar was the first thing anyone met before entering the tabernacle. Then come the curtains, posts and bases that enclose the courtyard, with an embroidered curtain at its entrance. Last comes the lamp: the Israelites are to bring pure oil of pressed olives, and Aaron and his sons are to keep the lamps burning from evening till morning.',
    questions: [
      {
        type: 'choice',
        question: 'What was the altar of burnt offering overlaid with?',
        choices: ['Bronze', 'Gold', 'Silver', 'Nothing — bare wood'],
        correctIndex: 0,
        explanation:
          'It was made of acacia wood and overlaid with bronze — unlike the furnishings inside the sanctuary, which were gold.',
      },
      {
        type: 'choice',
        question: 'What was at the four corners of the altar?',
        choices: ['Horns', 'Rings', 'Posts', 'Lamps'],
        correctIndex: 0,
        explanation:
          'Horns were made at the four corners, all of one piece with the altar, and overlaid with bronze.',
      },
      {
        type: 'choice',
        question: 'What kind of oil was to be used for the lamps?',
        choices: ['Pure oil of pressed olives', 'Any oil at all', 'Animal fat', 'Imported oil'],
        correctIndex: 0,
        explanation: 'They were to bring clear oil of pressed olives for the light.',
      },
      {
        type: 'choice',
        question: 'From when until when were the lamps to be tended?',
        choices: ['From evening till morning', 'From morning till evening', 'All day long', 'It was not set'],
        correctIndex: 0,
        explanation:
          'Aaron and his sons were to keep the lamps burning before the LORD from evening till morning.',
      },
      {
        type: 'choice',
        question: 'What did a person meet first on entering the courtyard?',
        choices: ['The altar of burnt offering', 'The lampstand', 'The ark', 'The table of the bread'],
        correctIndex: 0,
        explanation: 'The first thing on the way to God was sacrifice.',
      },
      {
        type: 'choice',
        question: 'What was hung at the entrance to the courtyard?',
        choices: ['A curtain', 'A bronze grating', 'Tabernacle frames', 'The altar of burnt offering'],
        correctIndex: 0,
        explanation:
          'A curtain embroidered with blue, purple and scarlet yarn and fine linen hung at the courtyard entrance.',
      },
      {
        type: 'choice',
        question: 'What kind of ordinance was the keeping of the lamps called?',
        choices: [
          'A lasting ordinance for the generations to come',
          'An ordinance for one year only',
          'An ordinance for the wilderness only',
          'An ordinance known only to priests',
        ],
        correctIndex: 0,
        explanation: 'It was to be "a lasting ordinance among the Israelites for the generations to come."',
      },
    ],
  },
  {
    book: 2,
    chapter: 28,
    summary:
      'How to make the priests’ garments. Aaron and his sons are set apart as priests, and holy garments are to be made for them "for glory and beauty." Two onyx stones are fastened to the shoulder pieces of the ephod, engraved with the names of the twelve sons of Israel. The breastpiece holds twelve gemstones in four rows, each engraved with a tribe’s name — so the priest carried the twelve tribes on his shoulders and over his heart whenever he entered the sanctuary. The Urim and Thummim go inside the breastpiece. Gold bells and pomegranates alternate round the hem of the robe so it sounds, and a gold plate on the turban reads "Holy to the LORD."',
    questions: [
      {
        type: 'choice',
        question: 'How were the priest’s garments to be made?',
        choices: ['For glory and beauty', 'Plainly', 'Lightly', 'As cheaply as possible'],
        correctIndex: 0,
        explanation: 'Holy garments were to be made for Aaron, to give him dignity and honour.',
      },
      {
        type: 'choice',
        question: 'What was engraved on the onyx stones of the ephod’s shoulder pieces?',
        choices: [
          'The names of the sons of Israel',
          'The Ten Commandments',
          'The priest’s own name',
          'Nothing was engraved',
        ],
        correctIndex: 0,
        explanation:
          'They were memorial stones, so that Aaron bore those names on his two shoulders as a memorial before the LORD.',
      },
      {
        type: 'choice',
        question: 'How many stones were set in the breastpiece?',
        choices: ['Twelve', 'Seven', 'Four', 'Ten'],
        correctIndex: 0,
        explanation:
          'Twelve stones were set in four rows, each engraved with the name of one of the twelve tribes.',
      },
      {
        type: 'choice',
        question: 'What was put inside the breastpiece?',
        choices: ['The Urim and Thummim', 'Manna', 'The stone tablets', 'Oil'],
        correctIndex: 0,
        explanation:
          'So that Aaron would always bear the means of making decisions for the Israelites over his heart before the LORD.',
      },
      {
        type: 'choice',
        question: 'What was fastened round the hem of the robe?',
        choices: [
          'Gold bells alternating with pomegranates',
          'Tassels and cords',
          'Gemstones',
          'Nothing at all',
        ],
        correctIndex: 0,
        explanation:
          'The sound would be heard as he entered and left the sanctuary, so that he would not die.',
      },
      {
        type: 'choice',
        question: 'What was engraved on the gold plate on the turban?',
        choices: ['Holy to the LORD', 'The LORD is my Banner', 'The LORD Will Provide', 'A holy people'],
        correctIndex: 0,
        explanation:
          'It was on Aaron’s forehead so that he might bear the guilt of the sacred gifts the Israelites brought.',
      },
      {
        type: 'choice',
        question: 'Where did the priest carry the names of the twelve tribes?',
        choices: [
          'On his shoulders and over his heart',
          'On his hands and feet',
          'On his head',
          'At his waist',
        ],
        correctIndex: 0,
        explanation:
          'The onyx on the shoulder pieces and the breastpiece over the heart — he stood before God carrying the people.',
      },
    ],
  },
  {
    book: 2,
    chapter: 29,
    summary:
      'The ceremony for ordaining priests. A young bull, two rams without defect and unleavened bread are prepared. Aaron and his sons are washed with water at the entrance to the tent, dressed, given their turbans, and anointing oil is poured on their heads. Then the sacrifices: the bull as a sin offering, one ram as a burnt offering, and the second ram for the ordination. Its blood is put on the lobe of the right ear, the thumb of the right hand and the big toe of the right foot — hearing, doing and walking all set apart. The ceremony lasts seven days. At the end God says, "I will dwell among the Israelites and be their God."',
    questions: [
      {
        type: 'choice',
        question: 'Which three places was the blood put on at the ordination?',
        choices: [
          'The lobe of the right ear, the right thumb and the right big toe',
          'The forehead, the palm and the sole',
          'The chest, the shoulder and the knee',
          'The eyes, the nose and the mouth',
        ],
        correctIndex: 0,
        explanation: 'It is read as setting apart what he hears, what he does and where he walks.',
      },
      {
        type: 'choice',
        question: 'How many days did the ordination last?',
        choices: ['Seven days', 'Three days', 'Forty days', 'Eight days'],
        correctIndex: 0,
        explanation: 'The ordination was carried out for seven days, and the altar was consecrated.',
      },
      {
        type: 'choice',
        question: 'What was poured on Aaron’s head?',
        choices: ['Anointing oil', 'Water', 'Blood', 'Incense'],
        correctIndex: 0,
        explanation: 'The anointing oil was poured on his head to set him apart as holy.',
      },
      {
        type: 'choice',
        question: 'What promise closes this chapter?',
        choices: [
          'I will dwell among the Israelites and be their God',
          'I will enlarge your land',
          'I will defeat your enemies',
          'I will give you long life',
        ],
        correctIndex: 0,
        explanation:
          'It says again that the point of the tabernacle and the priesthood is His presence with them.',
      },
      {
        type: 'choice',
        question: 'What was the first step of the ordination?',
        choices: [
          'Washing with water at the entrance to the tent',
          'Putting on the garments',
          'Anointing with oil',
          'Offering sacrifices',
        ],
        correctIndex: 0,
        explanation: 'The order was: wash, clothe, anoint, and then sacrifice.',
      },
      {
        type: 'choice',
        question: 'What was offered as the regular daily offering?',
        choices: [
          'Two year-old lambs — one in the morning and one at twilight',
          'One young bull',
          'Three rams',
          'Two doves',
        ],
        correctIndex: 0,
        explanation:
          'It was a regular burnt offering at the entrance to the tent of meeting, for the generations to come.',
      },
      {
        type: 'choice',
        question: 'Besides Aaron, who was made a priest?',
        choices: ['His sons', 'All the Levites', 'The elders', 'Bezalel and Oholiab'],
        correctIndex: 0,
        explanation: 'Aaron and his sons were set apart from among the Israelites to serve as priests.',
      },
    ],
  },
  {
    book: 2,
    chapter: 30,
    summary:
      'The remaining furnishings and rules. The altar of incense stands in the Holy Place in front of the curtain, and incense is burned on it morning and evening. Then, at a census, each person pays half a shekel as a ransom for his life — the rich are not to pay more, nor the poor less. A life is worth the same before God. The basin stands between the tent and the altar so the priests can wash their hands and feet. The anointing oil and the incense may be made only to the set formula, and no one may make the same for personal use. What is holy is not to be mixed with everyday things.',
    questions: [
      {
        type: 'choice',
        question: 'What was the rule about the amount of the ransom?',
        choices: [
          'The rich are not to pay more, nor the poor less',
          'Pay according to your wealth',
          'Each tribe pays a different amount',
          'Give whatever you wish',
        ],
        correctIndex: 0,
        explanation: 'Everyone paid half a shekel. A life is worth the same before God.',
      },
      {
        type: 'choice',
        question: 'Where was the basin placed and what was it for?',
        choices: [
          'Between the tent of meeting and the altar, for washing hands and feet',
          'Inside the Holy Place, for burning incense',
          'At the courtyard gate, for washing sacrifices',
          'Inside the Most Holy Place',
        ],
        correctIndex: 0,
        explanation:
          'The priests had to wash before entering the tent or approaching the altar, so that they would not die.',
      },
      {
        type: 'choice',
        question: 'When was incense burned on the altar of incense?',
        choices: [
          'When the lamps were tended in the morning and lit at twilight',
          'Only at midday',
          'Only on the Sabbath',
          'Only at the festivals',
        ],
        correctIndex: 0,
        explanation: 'It was regular incense before the LORD for the generations to come.',
      },
      {
        type: 'choice',
        question: 'What was forbidden concerning the anointing oil and the incense?',
        choices: [
          'No one was to make the same mixture for personal use',
          'They were not to be sold',
          'They were not to be made twice',
          'There was no rule',
        ],
        correctIndex: 0,
        explanation: 'What was set apart as holy was not to be pulled down into ordinary use.',
      },
      {
        type: 'choice',
        question: 'How much did each person pay as a ransom at the census?',
        choices: ['Half a shekel', 'One shekel', 'A tenth of a shekel', 'Two shekels'],
        correctIndex: 0,
        explanation:
          'Everyone counted, twenty years old or more, paid half a shekel by the sanctuary shekel.',
      },
      {
        type: 'choice',
        question: 'Where in the sanctuary was the altar of incense placed?',
        choices: [
          'In front of the curtain, before the ark',
          'Inside the Most Holy Place',
          'In the middle of the courtyard',
          'At the entrance to the tabernacle',
        ],
        correctIndex: 0,
        explanation:
          'It stood outside the curtain, opposite the atonement cover over the ark — the place where God would meet them.',
      },
      {
        type: 'choice',
        question: 'What was the ransom money used for?',
        choices: ['The service of the tent of meeting', 'The priests’ wages', 'The king', 'The poor'],
        correctIndex: 0,
        explanation:
          'It was used for the service of the tent, as a memorial before the LORD and a ransom for their lives.',
      },
    ],
  },
  {
    book: 2,
    chapter: 31,
    summary:
      'Who is going to make all this? God answers by calling Bezalel of the tribe of Judah by name, and says He has filled him "with the Spirit of God, with wisdom, with understanding, with knowledge and with all kinds of skills." Craftsmanship too is God’s gift. He appoints Oholiab of the tribe of Dan to help him, and gives skill to all who are skilled. Then He stresses the Sabbath again: however holy the work of building the tabernacle was, it could not push rest aside. At the end God gives Moses the two stone tablets, written by His own finger.',
    questions: [
      {
        type: 'choice',
        question: 'Whom did God call by name to make the tabernacle?',
        choices: ['Bezalel', 'Oholiab', 'Aaron', 'Hur'],
        correctIndex: 0,
        explanation: 'He called Bezalel son of Uri, the son of Hur, of the tribe of Judah.',
      },
      {
        type: 'choice',
        question: 'What did God fill Bezalel with?',
        choices: [
          'The Spirit of God — wisdom, understanding, knowledge and all kinds of skills',
          'Great wealth',
          'Great strength',
          'A long life',
        ],
        correctIndex: 0,
        explanation:
          'It stands out that the first person in the Bible described as filled with the Spirit of God is a craftsman.',
      },
      {
        type: 'choice',
        question: 'Whom did God appoint to help Bezalel?',
        choices: ['Oholiab', 'Bezalel', 'Ithamar', 'Eleazar'],
        correctIndex: 0,
        explanation: 'He appointed Oholiab son of Ahisamak, of the tribe of Dan.',
      },
      {
        type: 'choice',
        question: 'What did God stress again in the middle of the tabernacle work?',
        choices: ['The Sabbath', 'The offering', 'Sacrifice', 'Prayer'],
        correctIndex: 0,
        explanation: 'Not even holy work was a reason to skip rest. God called the Sabbath a sign.',
      },
      {
        type: 'choice',
        question: 'A sign of what did God call the Sabbath?',
        choices: [
          'A sign between me and you, so you may know that I am the LORD who makes you holy',
          'A sign of the ark',
          'A sign of the priesthood',
          'A sign of the land',
        ],
        correctIndex: 0,
        explanation: 'He called it a lasting covenant for the generations to come.',
      },
      {
        type: 'choice',
        question: 'What did Moses receive at the end of this chapter?',
        choices: [
          'The two stone tablets of the covenant law, written by the finger of God',
          'The tabernacle plans',
          'A staff',
          'The priestly garments',
        ],
        correctIndex: 0,
        explanation:
          'It says they were "inscribed by the finger of God." These are the tablets that get broken in chapter 32.',
      },
      {
        type: 'choice',
        question: 'What does this chapter show about craftsmanship?',
        choices: [
          'That skill and craft are also gifts from God',
          'That skill belongs to the world',
          'That only priests are holy',
          'That skill has to be learned',
        ],
        correctIndex: 0,
        explanation:
          'It says God gave ability to all the skilled workers to make everything He had commanded.',
      },
    ],
  },
  {
    book: 2,
    chapter: 32,
    summary:
      'While the covenant is being given on the mountain, the exact opposite is happening below it. When Moses is slow to come down, the people crowd round Aaron and say, "Make us gods who will go before us." Aaron collects their gold earrings and makes a calf, and the people say, "These are your gods, Israel, who brought you up out of Egypt." God is angry, and Moses pleads for them. Coming down and seeing it, Moses throws the two tablets and breaks them. Aaron excuses himself: "I threw it into the fire, and out came this calf." About three thousand die that day.',
    questions: [
      {
        type: 'choice',
        question: 'What did the people demand of Aaron?',
        choices: [
          'Make us gods who will go before us',
          'Go and find Moses',
          'Let us go back to Egypt',
          'Give us food',
        ],
        correctIndex: 0,
        explanation:
          'Their reason was that they did not know what had become of Moses. Waiting had broken down.',
      },
      {
        type: 'choice',
        question: 'What did Aaron make?',
        choices: ['A golden calf', 'A golden pillar', 'A golden snake', 'A golden chest'],
        correctIndex: 0,
        explanation:
          'He collected the people’s gold earrings, melted them down and cast an idol in the shape of a calf.',
      },
      {
        type: 'choice',
        question: 'What did Moses do when he came down the mountain?',
        choices: [
          'He threw the two tablets down and broke them',
          'He watched in silence',
          'He prayed at once',
          'He killed Aaron',
        ],
        correctIndex: 0,
        explanation: 'It is read as making visible what had already happened: the covenant was broken.',
      },
      {
        type: 'choice',
        question: 'What was Aaron’s excuse?',
        choices: [
          'I threw it into the fire, and out came this calf',
          'I made it',
          'I did not know',
          'The people made me do it, that is all',
        ],
        correctIndex: 0,
        explanation: 'He had shaped it with his own tool, yet spoke as if it had come out by itself.',
      },
      {
        type: 'choice',
        question: 'What did Moses say as he pleaded with God?',
        choices: [
          'But if not, then blot me out of the book you have written',
          'It is nothing to me',
          'Punish them',
          'Wait a while',
        ],
        correctIndex: 0,
        explanation: 'He stood between God and the people, putting himself on the line for them.',
      },
      {
        type: 'choice',
        question: 'Moses asked the people, "Whoever is for the ____, come to me."',
        choices: ['LORD', 'Moses', 'Aaron', 'Israel'],
        correctIndex: 0,
        explanation: 'All the Levites rallied to him, and about three thousand died that day.',
      },
      {
        type: 'choice',
        question: 'What did Moses do with the golden calf?',
        choices: [
          'He burned it, ground it to powder, scattered it on water and made them drink it',
          'He buried it',
          'He melted it into vessels',
          'He left it alone',
        ],
        correctIndex: 0,
        explanation: 'It made them learn in their own bodies that what they had made was nothing at all.',
      },
    ],
  },
  {
    book: 2,
    chapter: 33,
    summary:
      'God says, "I will not go with you, because you are a stiff-necked people and I might destroy you on the way." He will give them the land, but He will not go along. When the people hear it they mourn and take off their ornaments. Moses spoke with God at the tent of meeting face to face — the Bible says, "as one speaks to a friend." Moses pleads, "If your Presence does not go with us, do not send us up from here." God answers, "My Presence will go with you, and I will give you rest." Then Moses goes further and asks to see God’s glory.',
    questions: [
      {
        type: 'choice',
        question: '"My Presence will go with you, and I will give you ____."',
        choices: ['Rest', 'Victory', 'A way through', 'Life'],
        correctIndex: 0,
        explanation:
          'Moses clung to God after being told He would not go along, and this was the answer God gave.',
      },
      {
        type: 'choice',
        question: 'What did God say at first?',
        choices: [
          'I will not go up with you',
          'You will enter Canaan at once',
          'Go back to Egypt',
          'Stay here',
        ],
        correctIndex: 0,
        explanation: 'He would send an angel and give them the land, but He would not go with them Himself.',
      },
      {
        type: 'choice',
        question: 'How does the Bible describe Moses speaking with God at the tent?',
        choices: [
          'As one speaks to a friend',
          'Only by a voice from far off',
          'Only in dreams',
          'Only in writing',
        ],
        correctIndex: 0,
        explanation: 'It says, "The LORD would speak to Moses face to face."',
      },
      {
        type: 'choice',
        question: 'What did Moses plead for?',
        choices: [
          'If your Presence does not go with us, do not send us up from here',
          'Enlarge our land',
          'Defeat our enemies',
          'Give us food',
        ],
        correctIndex: 0,
        explanation: 'It is a confession that His presence matters more than the promised land.',
      },
      {
        type: 'choice',
        question: 'What did God do when Moses asked to see His glory?',
        choices: [
          'He put him in a cleft of the rock, covered him with His hand and let him see His back',
          'He showed him His face',
          'He refused',
          'He appeared as fire',
        ],
        correctIndex: 0,
        explanation: 'He said, "You cannot see my face, for no one may see me and live."',
      },
      {
        type: 'choice',
        question: 'What did the people do when they heard God’s words?',
        choices: [
          'They mourned and took off their ornaments',
          'They rejoiced',
          'They left',
          'They did nothing',
        ],
        correctIndex: 0,
        explanation: 'That He would not go with them was the heaviest news they could hear.',
      },
      {
        type: 'choice',
        question: 'What reason did Moses give for asking for God’s presence?',
        choices: [
          'Because it is what sets us apart from all the other people on earth',
          'Because the road was hard',
          'Because there were many enemies',
          'Because the people wanted it',
        ],
        correctIndex: 0,
        explanation: 'His presence itself is what makes this people who they are.',
      },
    ],
  },
  {
    book: 2,
    chapter: 34,
    summary:
      'God tells Moses to chisel two stone tablets like the first ones and come up the mountain. Then He comes down in the cloud and proclaims Himself: "The LORD, the LORD, the compassionate and gracious God, slow to anger, abounding in love and faithfulness." Along with this comes the word that He forgives sin yet does not leave the guilty unpunished. Moses bows down at once, worships, asks again that God go with them, and God renews the covenant. After forty days and forty nights Moses comes down with his face shining, and because the people are afraid he covers his face with a veil.',
    questions: [
      {
        type: 'choice',
        question: 'God proclaimed Himself "compassionate and gracious, slow to ____."',
        choices: ['Anger', 'Speak', 'Judge', 'Forget'],
        correctIndex: 0,
        explanation:
          'He said He abounds in love and faithfulness. It is a verse quoted many times in the Bible.',
      },
      {
        type: 'choice',
        question: 'Who chiselled the second set of tablets?',
        choices: ['Moses', 'God', 'Aaron', 'Bezalel'],
        correctIndex: 0,
        explanation:
          'God made the first ones, but Moses chiselled the second set and carried them up — and God wrote on them.',
      },
      {
        type: 'choice',
        question: 'What was Moses’ face like when he came down?',
        choices: ['It was radiant', 'It was dark', 'It was pale', 'It was unchanged'],
        correctIndex: 0,
        explanation:
          'Because he had spoken with the LORD his face was radiant, and the people were afraid to come near him.',
      },
      {
        type: 'choice',
        question: 'What did Moses do about the radiance?',
        choices: [
          'When he finished speaking he put a veil over his face',
          'He went back up the mountain',
          'He did nothing',
          'He sent the people away',
        ],
        correctIndex: 0,
        explanation: 'He removed the veil whenever he went in to speak before the LORD.',
      },
      {
        type: 'choice',
        question: 'What was especially warned against in the renewed covenant?',
        choices: [
          'Do not make a treaty with the people of the land; break down their altars',
          'Do not go to war',
          'Do not farm',
          'Do not build cities',
        ],
        correctIndex: 0,
        explanation:
          'They were to cut down the idols and Asherah poles, in case they came to serve those gods.',
      },
      {
        type: 'choice',
        question: 'How many days did Moses stay on the mountain?',
        choices: ['Forty days', 'Seven days', 'Three days', 'Three months'],
        correctIndex: 0,
        explanation: 'He was there forty days and forty nights without eating bread or drinking water.',
      },
      {
        type: 'choice',
        question: 'What comes right after God’s proclamation?',
        choices: [
          'He forgives sin, yet he does not leave the guilty unpunished',
          'He treats every sin as if it never happened',
          'He punishes no one',
          'He punishes everyone',
        ],
        correctIndex: 0,
        explanation:
          'Mercy and justice are proclaimed together. It is a place you must not read only one half of.',
      },
    ],
  },
  {
    book: 2,
    chapter: 35,
    summary:
      'Now the tabernacle actually starts to be built. Moses speaks about the Sabbath again first, then asks for the offering. The condition is the same as in chapter 25: "Everyone who is willing is to bring an offering." So those whose hearts were moved and who were willing brought their gifts. Men and women came together; women who were skilled spun with their own hands and brought blue, purple and scarlet yarn and fine linen. The leaders brought onyx and other gemstones, oil and spices. Moses tells them God has called Bezalel and Oholiab by name and given them the ability to teach as well.',
    questions: [
      {
        type: 'choice',
        question: 'What was the basis for bringing an offering?',
        choices: [
          'Everyone who was willing, whose heart moved them',
          'Everyone equally',
          'Only the leaders',
          'Only the rich',
        ],
        correctIndex: 0,
        explanation: 'Everyone whose heart was moved and who was willing brought an offering.',
      },
      {
        type: 'choice',
        question: 'What did the skilled women do?',
        choices: [
          'They spun yarn with their own hands and brought it',
          'They brought gold',
          'They cut down trees',
          'They prepared food',
        ],
        correctIndex: 0,
        explanation: 'Some of them spun goat hair as well. Each took part with what she could do.',
      },
      {
        type: 'choice',
        question: 'What did Moses speak about before asking for the offering?',
        choices: ['The Sabbath', 'Sacrifice', 'War', 'A census'],
        correctIndex: 0,
        explanation:
          'However busy the building work, the seventh day was still for rest. It is stressed again after chapter 31.',
      },
      {
        type: 'choice',
        question: 'Which two men were named to take charge of the work?',
        choices: ['Bezalel and Oholiab', 'Aaron and Hur', 'Nadab and Abihu', 'Ithamar and Eleazar'],
        correctIndex: 0,
        explanation: 'God filled them with skill and gave them the ability to teach others as well.',
      },
      {
        type: 'choice',
        question: 'What did the leaders bring?',
        choices: ['Onyx and other gemstones, oil and spices', 'Grain', 'Livestock', 'Weapons'],
        correctIndex: 0,
        explanation:
          'They brought stones to be mounted on the ephod and breastpiece, and oil and spices for the light, the anointing oil and the incense.',
      },
      {
        type: 'choice',
        question: 'What kind of participation does this chapter show?',
        choices: [
          'Everyone taking part with what they had, regardless of sex or status',
          'Only the leaders taking part',
          'Only the priests taking part',
          'No one taking part',
        ],
        correctIndex: 0,
        explanation: 'Some gave gold, some spun yarn, some brought wood.',
      },
      {
        type: 'choice',
        question: 'What was specifically forbidden on the Sabbath?',
        choices: ['Lighting a fire', 'Walking', 'Speaking', 'Eating'],
        correctIndex: 0,
        explanation: 'It says, "Do not light a fire in any of your dwellings on the Sabbath day."',
      },
    ],
  },
  {
    book: 2,
    chapter: 36,
    summary:
      'Bezalel, Oholiab and every skilled person begin the work. Then comes a scene rarely found anywhere in the Bible. Since the people keep bringing freewill offerings morning after morning, the workers come to Moses and say, "The people are bringing more than enough for doing the work." Moses gives an order that no one bring anything more. They stopped not because there was too little, but because there was too much. Then the actual building: curtains, frames and crossbars, the curtain dividing the Holy Place from the Most Holy Place, and the curtain for the entrance — all exactly as instructed.',
    questions: [
      {
        type: 'choice',
        question: 'What did the workers come and say to Moses?',
        choices: [
          'The people are bringing more than enough for the work',
          'We are short of materials',
          'The work is too hard',
          'There is not enough time',
        ],
        correctIndex: 0,
        explanation:
          'Moses ordered that nothing more be brought. It is a rare scene of stopping because of excess, not shortage.',
      },
      {
        type: 'choice',
        question: 'What order did Moses give?',
        choices: [
          'No man or woman is to make anything else as an offering',
          'Bring more',
          'Bring half as much',
          'Convert it into money',
        ],
        correctIndex: 0,
        explanation:
          'The people stopped bringing, and what they already had was more than enough for all the work.',
      },
      {
        type: 'choice',
        question: 'What was mainly made in this chapter?',
        choices: [
          'The curtains, frames and crossbars of the tabernacle, and the two curtains',
          'The priestly garments',
          'The ark of the covenant',
          'The altar of burnt offering',
        ],
        correctIndex: 0,
        explanation:
          'They made the frame and coverings of the tabernacle, the dividing curtain and the curtain for the entrance.',
      },
      {
        type: 'choice',
        question: 'What did the workers have in common?',
        choices: [
          'They were skilled, and the LORD had given them ability',
          'They were the oldest',
          'They were leaders',
          'They were priests',
        ],
        correctIndex: 0,
        explanation: 'Everyone whose heart moved them to come and do the work joined in.',
      },
      {
        type: 'choice',
        question: 'What was worked into the curtain dividing the Holy Place from the Most Holy Place?',
        choices: ['Cherubim', 'Palm trees', 'Pomegranates', 'Lilies'],
        correctIndex: 0,
        explanation:
          'It was made of blue, purple and scarlet yarn and fine linen, with cherubim skilfully worked into it.',
      },
      {
        type: 'choice',
        question: 'How did the finished work differ from the instructions?',
        choices: [
          'It did not — they made it exactly as instructed',
          'They made it bigger',
          'They made it simpler',
          'They changed the materials',
        ],
        correctIndex: 0,
        explanation:
          'The instructions in chapters 25–31 and the building in 35–40 repeat almost the same sentences. That is the point: they did exactly as told.',
      },
      {
        type: 'choice',
        question: 'What does this chapter show?',
        choices: [
          'That willing hearts together can bring more than enough',
          'That giving only happens under compulsion',
          'That leaders must carry it all',
          'That materials always run short',
        ],
        correctIndex: 0,
        explanation:
          'It is the result of the rule given in chapter 25: receive it from everyone whose heart prompts them to give.',
      },
    ],
  },
  {
    book: 2,
    chapter: 37,
    summary:
      'Bezalel makes the furnishings that go inside the sanctuary. He makes the ark of acacia wood and overlays it inside and out with pure gold, then makes the atonement cover and two cherubim of pure gold, wings spread over the cover and faces turned toward each other. Then the table for the bread and its utensils, the lampstand hammered out of pure gold with its seven lamps, and the altar of incense. The anointing oil and the incense are blended as a perfumer would. This chapter is not new instruction but a record of doing exactly what chapters 25 and 30 commanded. The Bible writes it twice to show it was done just so.',
    questions: [
      {
        type: 'choice',
        question: 'Who made the furnishings in this chapter?',
        choices: ['Bezalel', 'Oholiab', 'Aaron', 'Ithamar'],
        correctIndex: 0,
        explanation: 'It begins with Bezalel making the ark of acacia wood.',
      },
      {
        type: 'choice',
        question: 'What was the ark overlaid with?',
        choices: ['Pure gold, inside and out', 'Bronze', 'Silver', 'Leather'],
        correctIndex: 0,
        explanation: 'He overlaid it inside and out with pure gold and made a gold moulding round it.',
      },
      {
        type: 'choice',
        question: 'How were the two cherubim made?',
        choices: [
          'With wings spread over the cover and faces toward each other',
          'Standing back to back',
          'Looking downward',
          'With folded wings',
        ],
        correctIndex: 0,
        explanation:
          'Their faces were turned toward the cover — the place where God said He would meet them.',
      },
      {
        type: 'choice',
        question: 'How was the lampstand made?',
        choices: [
          'Hammered out of pure gold, all of one piece',
          'Joined from several pieces',
          'Wood overlaid with gold',
          'Of bronze',
        ],
        correctIndex: 0,
        explanation: 'Its base, shaft, cups, buds and blossoms were all of one piece with it.',
      },
      {
        type: 'choice',
        question: 'What kind of chapter is this?',
        choices: [
          'A record of carrying out the instructions of chapters 25 and 30',
          'New instruction',
          'The people’s complaints',
          'A record of war',
        ],
        correctIndex: 0,
        explanation:
          'The same content is written twice — once as command, once as execution. That is how it shows full obedience.',
      },
      {
        type: 'choice',
        question: 'How many lamps did the lampstand have?',
        choices: ['Seven', 'Three', 'Twelve', 'Five'],
        correctIndex: 0,
        explanation: 'He made its seven lamps, its wick trimmers and its trays of pure gold.',
      },
      {
        type: 'choice',
        question: 'How were the anointing oil and the incense made?',
        choices: [
          'Pure, blended the way a perfumer would',
          'Any way at all',
          'The Egyptian way',
          'They were not made',
        ],
        correctIndex: 0,
        explanation:
          'He made the sacred anointing oil and the pure fragrant incense, the work of a perfumer.',
      },
    ],
  },
  {
    book: 2,
    chapter: 38,
    summary:
      'The things for the courtyard are made: the altar of burnt offering and its utensils, the basin, and the curtains, posts and bases of the courtyard. The basin, it says, was made from the bronze mirrors of the women who served at the entrance to the tent of meeting. The second half is an account: the weight of the gold, silver and bronze that was used is written down item by item. The silver came from the ransom paid by those who were counted, and it was cast into the bases of the sanctuary. Moses gave the order and Ithamar the Levite supervised the reckoning. Even gifts given to God are accounted for openly here.',
    questions: [
      {
        type: 'choice',
        question: 'What was the basin made from?',
        choices: [
          'The bronze mirrors of the women who served at the entrance to the tent',
          'Newly bought bronze',
          'Gold',
          'Stone',
        ],
        correctIndex: 0,
        explanation: 'They gave up the mirrors they looked at themselves in, to make a vessel for washing.',
      },
      {
        type: 'choice',
        question: 'What comes in the second half of this chapter?',
        choices: [
          'An account of the gold, silver and bronze used',
          'New instructions',
          'A list of priests',
          'A record of war',
        ],
        correctIndex: 0,
        explanation: 'Each weight is written down, showing what was used and where.',
      },
      {
        type: 'choice',
        question: 'Where did the silver come from?',
        choices: [
          'The ransom paid by those who were counted',
          'What they brought out of Egypt',
          'The leaders’ offerings',
          'The spoils of war',
        ],
        correctIndex: 0,
        explanation:
          'The half shekel from everyone counted, twenty years old or more, was used to cast the bases of the sanctuary.',
      },
      {
        type: 'choice',
        question: 'What was the name of the Levite who supervised the accounting?',
        choices: ['Ithamar', 'Eleazar', 'Bezalel', 'Oholiab'],
        correctIndex: 0,
        explanation: 'Ithamar son of Aaron the priest had the Levites do the reckoning at Moses’ command.',
      },
      {
        type: 'choice',
        question: 'What was the altar of burnt offering overlaid with?',
        choices: ['Bronze', 'Gold', 'Silver', 'Leather'],
        correctIndex: 0,
        explanation:
          'It was made of acacia wood and overlaid with bronze, and all its utensils were bronze too.',
      },
      {
        type: 'choice',
        question: 'What attitude does this chapter show?',
        choices: [
          'Making clear exactly what the offerings were spent on',
          'Collecting as much as possible',
          'Building quickly',
          'Being sparing',
        ],
        correctIndex: 0,
        explanation: 'The Bible itself shows that the holier the work, the more open the accounting must be.',
      },
      {
        type: 'choice',
        question: 'What were the bases of the courtyard posts made of?',
        choices: ['Bronze', 'Gold', 'Silver', 'Wood'],
        correctIndex: 0,
        explanation: 'The bases were bronze, while the hooks and bands were silver.',
      },
    ],
  },
  {
    book: 2,
    chapter: 39,
    summary:
      'The priestly garments are made. The ephod and breastpiece, the robe and tunics, the turban and sashes, all exactly as instructed in chapter 28. Gold was hammered thin and cut into threads to be worked in with the blue, purple and scarlet yarn. Twelve stones were mounted on the breastpiece and engraved with the tribes’ names, and a plate of pure gold engraved "Holy to the LORD" was fastened to the turban. Through this chapter the phrase "as the LORD commanded Moses" keeps coming back. At the end everything is brought to Moses, who inspects it, sees it was done as commanded, and blesses them.',
    questions: [
      {
        type: 'choice',
        question: 'What phrase keeps coming back in this chapter?',
        choices: [
          'As the LORD commanded Moses',
          'As the people wished',
          'As it looked best',
          'As circumstances allowed',
        ],
        correctIndex: 0,
        explanation: 'Repeated over and over, it stresses that command and execution never came apart.',
      },
      {
        type: 'choice',
        question: 'How was the gold made into thread?',
        choices: [
          'Hammered thin and cut into strands',
          'Melted and poured',
          'Ground into powder',
          'Bought ready-made',
        ],
        correctIndex: 0,
        explanation:
          'They hammered out thin sheets of gold, cut them into threads, and worked them into the yarn and fine linen.',
      },
      {
        type: 'choice',
        question: 'What was engraved on the plate of pure gold?',
        choices: ['Holy to the LORD', 'The LORD is my Banner', 'A holy people', 'A kingdom of priests'],
        correctIndex: 0,
        explanation: 'They made the sacred emblem and tied it to the turban with a blue cord.',
      },
      {
        type: 'choice',
        question: 'What did Moses do when everything was brought to him?',
        choices: [
          'He inspected it, saw it was done as commanded, and blessed them',
          'He told them to make it again',
          'He said nothing',
          'He sent part of it back',
        ],
        correctIndex: 0,
        explanation:
          'Moses inspected all the work and saw that they had done it just as the LORD had commanded, so he blessed them.',
      },
      {
        type: 'choice',
        question: 'What was engraved on the stones set in the breastpiece?',
        choices: [
          'The names of the twelve tribes of Israel',
          'The Ten Commandments',
          'The priest’s name',
          'Nothing',
        ],
        correctIndex: 0,
        explanation: 'They were engraved like a seal with the names of the twelve tribes.',
      },
      {
        type: 'choice',
        question: 'What was fastened round the hem of the robe?',
        choices: ['Gold bells alternating with pomegranates', 'Gemstones', 'Tassels', 'Nothing at all'],
        correctIndex: 0,
        explanation: 'Bells and pomegranates alternated, exactly as chapter 28 instructed.',
      },
      {
        type: 'choice',
        question: 'Where do things stand at the end of this chapter?',
        choices: [
          'Every part of the tabernacle is finished and brought to Moses',
          'The tabernacle has been set up',
          'The sacrifices have begun',
          'The people have left',
        ],
        correctIndex: 0,
        explanation: 'Setting it up belongs to the next chapter. Here all the parts are completed.',
      },
    ],
  },
  {
    book: 2,
    chapter: 40,
    summary:
      'The last chapter of Exodus. God tells Moses to set up the tabernacle on the first day of the first month. Moses raises the frames, hangs the curtain, brings in the ark, places the table, the lampstand and the altar of incense, sets the altar of burnt offering and the basin, and puts up the courtyard. Here too "as the LORD commanded Moses" keeps coming back. Aaron and his sons are washed, clothed and anointed. Then comes the final scene: the cloud covers the tent of meeting and the glory of the LORD fills the tabernacle, so that Moses cannot enter. From then on, when the cloud lifted they set out; when it stayed, they stayed.',
    questions: [
      {
        type: 'choice',
        question: 'What filled the tabernacle when it was finished?',
        choices: [
          'The glory of the LORD',
          'A pillar of fire',
          'The smoke of the incense',
          'The blood of the offerings',
        ],
        correctIndex: 0,
        explanation:
          '"The cloud covered the tent of meeting, and the glory of the LORD filled the tabernacle." The promise to dwell with them became visible.',
      },
      {
        type: 'choice',
        question: 'What happened to Moses when the glory filled it?',
        choices: [
          'He could not enter the tent of meeting',
          'He went in first',
          'He entered the Most Holy Place',
          'Nothing happened',
        ],
        correctIndex: 0,
        explanation: 'The cloud settled on the tent and the glory filled it, so not even Moses could go in.',
      },
      {
        type: 'choice',
        question: 'What decided when Israel travelled and when they stayed?',
        choices: [
          'They set out when the cloud lifted from the tabernacle, and stayed when it did not',
          'Moses’ judgement',
          'A fixed calendar',
          'The people’s decision',
        ],
        correctIndex: 0,
        explanation: 'The cloud was over it by day and fire by night, in the sight of all Israel.',
      },
      {
        type: 'choice',
        question: 'When was the tabernacle set up?',
        choices: [
          'On the first day of the first month of the second year',
          'On the last day of the first year',
          'In the spring of the third year',
          'It is not stated',
        ],
        correctIndex: 0,
        explanation:
          'It was set up on the first day of the first month of the second year after leaving Egypt.',
      },
      {
        type: 'choice',
        question: 'What phrase is repeated in this chapter too?',
        choices: [
          'As the LORD commanded Moses',
          'As the people wished',
          'As circumstances allowed',
          'As it looked best',
        ],
        correctIndex: 0,
        explanation: 'It is attached to each step of the setting up.',
      },
      {
        type: 'choice',
        question: 'What was done for Aaron and his sons?',
        choices: [
          'They were washed, clothed and anointed for the priesthood',
          'They were set to guard the courtyard',
          'They were told to prepare offerings',
          'They were told to teach the people',
        ],
        correctIndex: 0,
        explanation: 'That anointing made them priests for all generations to come.',
      },
      {
        type: 'choice',
        question: 'Where does Exodus end?',
        choices: [
          'With God coming to dwell among His people',
          'With entering Canaan',
          'With a victory in war',
          'With a king being crowned',
        ],
        correctIndex: 0,
        explanation: 'Exodus ends with a people who had been slaves becoming a people God lives among.',
      },
    ],
  },
];
