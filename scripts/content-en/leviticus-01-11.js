/**
 * Bible Reading Helper content (English) — Leviticus 1–11
 *
 * Mirrors scripts/content/leviticus-01-11.js chapter for chapter, question for
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
    book: 3,
    chapter: 1,
    summary:
      'Exodus ended with the tabernacle standing, and Leviticus deals with how to come to God there. The first offering is the burnt offering, in which the animal is burned whole. Not part of it, but all of it. It could be a bull, a sheep or a bird, according to what a person could afford — a poor person could bring a dove, so no one was shut out. The worshipper lays a hand on the animal’s head, a sign that says, "This offering stands in my place."',
    questions: [
      {
        type: 'choice',
        question: 'What is distinctive about the burnt offering?',
        choices: ['The animal is burned whole', 'Only part is burned', 'Nothing is burned', 'It is only eaten'],
        correctIndex: 0,
        explanation:
          'It carried the meaning of giving everything, which is why it is called a whole burnt offering.',
      },
      {
        type: 'choice',
        question: 'Which of these could NOT be brought as a burnt offering?',
        choices: ['Fish', 'A bull', 'A sheep or goat', 'A dove'],
        correctIndex: 0,
        explanation:
          'It could be from the herd, from the flock, or a turtledove or young pigeon, as a person could afford.',
      },
      {
        type: 'choice',
        question: 'What did it mean when the worshipper laid a hand on the animal’s head?',
        choices: [
          'A sign that the offering stood in his place',
          'A way of holding the animal still',
          'A gesture of blessing',
          'It meant nothing',
        ],
        correctIndex: 0,
        explanation:
          'It says, "it will be accepted on his behalf to make atonement for him."',
      },
      {
        type: 'choice',
        question: 'What did the burnt offering have to be?',
        choices: ['A male without defect', 'The largest one', 'The fattest one', 'Anything at all'],
        correctIndex: 0,
        explanation:
          'It had to be without defect, presented at the entrance to the tent of meeting so it would be acceptable to the LORD.',
      },
      {
        type: 'choice',
        question: 'Why could a poor person still bring an offering?',
        choices: [
          'Because a dove could be brought instead',
          'Because animals were given free',
          'Because they were exempt',
          'Because the nation offered for them',
        ],
        correctIndex: 0,
        explanation:
          'The way was left open according to what people could afford, so no one was excluded.',
      },
      {
        type: 'short',
        question: 'Where were the offerings of Leviticus presented?',
        acceptedAnswers: ['the tent of meeting', 'tent of meeting', 'the tabernacle', 'the entrance to the tent of meeting'],
        explanation:
          'Leviticus opens with the LORD calling to Moses and speaking to him from the tent of meeting.',
      },
      {
        type: 'choice',
        question: 'Why does Leviticus come right after Exodus?',
        choices: [
          'The tabernacle is standing, so now it deals with how to come to God',
          'To prepare for war',
          'To record a genealogy',
          'To divide the land',
        ],
        correctIndex: 0,
        explanation:
          'How to live before a God who dwells among you is the theme of Leviticus.',
      },
    ],
  },
  {
    book: 3,
    chapter: 2,
    summary:
      'The grain offering is made from grain. It is the one offering with no blood: fine flour with oil poured on it and incense laid on top. It could be baked in an oven, cooked on a griddle or in a pan. Two things are forbidden — no yeast and no honey — and one is required: salt, always. It is called the salt of the covenant, a way of speaking about a relationship that does not change. A handful is burned and the rest belongs to the priests. It was an offering of what a person had grown with their own hands.',
    questions: [
      {
        type: 'choice',
        question: 'What is the grain offering made of?',
        choices: ['Grain (fine flour)', 'A bull', 'A sheep', 'A dove'],
        correctIndex: 0,
        explanation:
          'It is an offering without blood: fine flour with oil poured on it and incense laid on top.',
      },
      {
        type: 'choice',
        question: 'Which two things were not to be put in the grain offering?',
        choices: ['Yeast and honey', 'Salt and oil', 'Incense and oil', 'Water and salt'],
        correctIndex: 0,
        explanation:
          'No yeast and no honey — but salt was always to be added.',
      },
      {
        type: 'short',
        question: 'What had to be added to every grain offering?',
        acceptedAnswers: ['salt'],
        explanation:
          'It says, "Do not leave the salt of the covenant of your God out of your grain offerings."',
      },
      {
        type: 'choice',
        question: 'Who received the rest of the grain offering?',
        choices: ['Aaron and his sons, the priests', 'The one who brought it', 'The poor', 'It was all burned'],
        correctIndex: 0,
        explanation:
          'A handful was burned as a memorial portion, and the rest was a most holy part belonging to the priests.',
      },
      {
        type: 'choice',
        question: 'Which way of preparing the grain offering is NOT mentioned?',
        choices: ['Boiling in water', 'Baking in an oven', 'Cooking on a griddle', 'Cooking in a pan'],
        correctIndex: 0,
        explanation:
          'Three ways are given — oven, griddle and pan — and all of them were made with oil.',
      },
      {
        type: 'choice',
        question: 'How does the grain offering differ from the others?',
        choices: [
          'There is no shedding of blood',
          'A priest brings it',
          'It is offered only at night',
          'It is offered only at festivals',
        ],
        correctIndex: 0,
        explanation:
          'It was an offering not of an animal but of what the ground had produced.',
      },
      {
        type: 'choice',
        question: 'What is salt said to stand for?',
        choices: ['The covenant', 'Cleanness', 'Joy', 'Sorrow'],
        correctIndex: 0,
        explanation:
          'It is called "the salt of the covenant," a way of speaking about a relationship that does not change.',
      },
    ],
  },
  {
    book: 3,
    chapter: 3,
    summary:
      'The fellowship offering. As the name says, it stands for peace between God and people, and between people and each other. It differs from the other offerings in one way: the worshipper ate part of it too. It was a meal eaten in God’s presence, and so it often belonged to occasions of joy and thanksgiving. Only the fat and the blood were not to be eaten — the fat because it was the best part and belonged to God, and the blood because it stands for life. This is set down as a lasting ordinance for the generations to come.',
    questions: [
      {
        type: 'choice',
        question: 'How does the fellowship offering differ from the others?',
        choices: [
          'The one who brought it ate part of it too',
          'No blood was sprinkled',
          'No priest offered it',
          'It was offered only at night',
        ],
        correctIndex: 0,
        explanation:
          'It was like a meal eaten in God’s presence, and belonged to occasions of joy and thanksgiving.',
      },
      {
        type: 'choice',
        question: 'Which two things were not to be eaten?',
        choices: ['The fat and the blood', 'The meat and the bones', 'The organs and the legs', 'The head and the tail'],
        correctIndex: 0,
        explanation:
          'The fat was God’s portion, and the blood stands for life.',
      },
      {
        type: 'choice',
        question: 'What does the name "fellowship offering" point to?',
        choices: [
          'Peace between God and people, and between people',
          'The end of a war',
          'The removal of sin',
          'The end of harvest',
        ],
        correctIndex: 0,
        explanation:
          'Eating together where a relationship has been restored is the character of this offering.',
      },
      {
        type: 'choice',
        question: 'What animals could be brought for a fellowship offering?',
        choices: [
          'Cattle, sheep or goats, male or female, without defect',
          'Males only',
          'Cattle only',
          'Birds only',
        ],
        correctIndex: 0,
        explanation:
          'Unlike the burnt offering, which had to be male, this one could be male or female.',
      },
      {
        type: 'short',
        question: 'What kind of ordinance was the rule against eating fat and blood called?',
        acceptedAnswers: ['a lasting ordinance', 'lasting ordinance', 'an everlasting ordinance', 'a lasting ordinance for the generations to come'],
        explanation:
          '"You must not eat any fat or any blood" is set down as a lasting ordinance for the generations to come.',
      },
      {
        type: 'choice',
        question: 'What was the fat given to God called?',
        choices: [
          'Food, a food offering presented to the LORD',
          'The priests’ portion',
          'The people’s portion',
          'Something to be thrown away',
        ],
        correctIndex: 0,
        explanation:
          'It says, "All the fat is the LORD’s."',
      },
      {
        type: 'choice',
        question: 'Which action is repeated in the fellowship offering too?',
        choices: [
          'Laying a hand on the animal’s head',
          'Tearing one’s clothes',
          'Fasting',
          'Singing',
        ],
        correctIndex: 0,
        explanation:
          'A hand was laid on it as a sign that it stood in the worshipper’s place, and it was slaughtered at the entrance to the tent.',
      },
    ],
  },
  {
    book: 3,
    chapter: 4,
    summary:
      'The sin offering. What it deals with is sin committed "unintentionally" — sin done without knowing. Not knowing does not make it as though it never happened; that is the premise of this chapter. The offering depends on who sinned: a bull for a priest, a bull for the whole assembly, a male goat for a leader, a female goat or lamb for a common person. The greater the responsibility, the heavier the treatment — and it stands out that a priest’s sin weighs the same as the whole congregation’s. Blood is sprinkled before the curtain and put on the horns of the altar, the fat is burned, and the rest is burned outside the camp.',
    questions: [
      {
        type: 'choice',
        question: 'What kind of sin does the sin offering deal with?',
        choices: ['Sin committed unintentionally', 'Deliberate sin', 'Someone else’s sin', 'Ancestors’ sin'],
        correctIndex: 0,
        explanation:
          'Not knowing does not make it as though it never happened; that is the premise of this chapter.',
      },
      {
        type: 'choice',
        question: 'What was the offering when a priest sinned?',
        choices: ['A young bull without defect', 'A male goat', 'A female goat', 'A dove'],
        correctIndex: 0,
        explanation:
          'It is the same offering as when the whole assembly sinned. The weightier the office, the heavier the treatment.',
      },
      {
        type: 'choice',
        question: 'What was the offering when a common person sinned?',
        choices: ['A female goat or a young female lamb', 'A young bull', 'A male goat', 'A whole herd'],
        correctIndex: 0,
        explanation:
          'The offering differed with a person’s position and means.',
      },
      {
        type: 'choice',
        question: 'What was the offering when a leader sinned?',
        choices: ['A male goat without defect', 'A young bull', 'A female goat', 'A dove'],
        correctIndex: 0,
        explanation:
          'A bull for the priest and the assembly, a male goat for a leader, a female goat or lamb for a common person.',
      },
      {
        type: 'choice',
        question: 'What principle does this chapter show?',
        choices: [
          'The greater the responsibility, the more weightily sin is treated',
          'Leaders do not sin',
          'Only common people sin',
          'What you do not know is not sin',
        ],
        correctIndex: 0,
        explanation:
          'A priest’s sin called for the same offering as the sin of the whole assembly.',
      },
      {
        type: 'short',
        question: 'Where was the blood of the sin offering put?',
        acceptedAnswers: ['the horns of the altar', 'the horns', 'on the altar horns'],
        explanation:
          'It was sprinkled seven times before the curtain and put on the horns of the altar, and the rest was poured out at the base.',
      },
      {
        type: 'choice',
        question: 'What phrase is repeated as the result of the sin offering?',
        choices: ['And he will be forgiven', 'And he will become rich', 'And he will live long', 'Nothing is said'],
        correctIndex: 0,
        explanation:
          'The words "the priest will make atonement for him, and he will be forgiven" keep coming back.',
      },
    ],
  },
  {
    book: 3,
    chapter: 5,
    summary:
      'The sin offering continues with specific cases: knowing something as a witness and saying nothing, touching something unclean without realising it, making a thoughtless oath. In such cases the person had first to confess the sin, then bring the offering. Someone who could not afford an animal could bring two doves, and someone who could not manage that could bring fine flour. The second half is the guilt offering, brought when someone has caused loss to holy things or to a neighbour — and here a condition is attached. It is not enough to sacrifice; **the loss must be repaid with a fifth added**.',
    questions: [
      {
        type: 'choice',
        question: 'What was required with the guilt offering, besides the sacrifice?',
        choices: [
          'Repaying the loss with a fifth added',
          'Fasting',
          'A year of service',
          'Nothing else',
        ],
        correctIndex: 0,
        explanation:
          'There was a sacrifice given to God and restitution made to people, together.',
      },
      {
        type: 'choice',
        question: 'What had to be done before bringing the offering?',
        choices: ['Confess the sin', 'Fast', 'Change clothes', 'Wait'],
        correctIndex: 0,
        explanation:
          'It says, "they must confess in what way they have sinned." Admitting it came before the ritual.',
      },
      {
        type: 'choice',
        question: 'What could someone who was poor bring?',
        choices: [
          'Two doves, or, failing that, fine flour',
          'Nothing at all',
          'Money only',
          'A neighbour offered for them',
        ],
        correctIndex: 0,
        explanation:
          'Poverty was not allowed to block anyone from coming to God.',
      },
      {
        type: 'choice',
        question: 'Which of these is NOT one of the examples of sin in this chapter?',
        choices: [
          'Buying a neighbour’s field',
          'Knowing something as a witness and saying nothing',
          'Touching something unclean without realising it',
          'Making a thoughtless oath',
        ],
        correctIndex: 0,
        explanation:
          'It stands out that staying silent when you know something is treated as sin.',
      },
      {
        type: 'short',
        question: 'How much had to be added to the repayment in the guilt offering?',
        acceptedAnswers: ['a fifth', 'one fifth', '1/5', '20%'],
        explanation:
          'Anyone who had caused loss to holy things had to repay it with a fifth added and give it to the priest.',
      },
      {
        type: 'choice',
        question: 'What does the rule about witnesses mean?',
        choices: [
          'Staying silent when you know is also sin',
          'You need not testify',
          'You only have to say what you heard',
          'A witness is never punished',
        ],
        correctIndex: 0,
        explanation:
          '"If anyone does not speak up when they hear a public charge, they will be held responsible."',
      },
      {
        type: 'choice',
        question: 'What was left out of the poor person’s grain offering?',
        choices: ['Oil and incense', 'Salt', 'Flour', 'Water'],
        correctIndex: 0,
        explanation:
          'Because it was a sin offering, no oil was poured on it and no incense was put on it.',
      },
    ],
  },
  {
    book: 3,
    chapter: 6,
    summary:
      'The first part continues the guilt offering. Cheating a neighbour over something entrusted to you, robbing someone, finding lost property and denying it — in such cases you must add a fifth and **give it back to the owner first**, and then bring the offering. You cannot leave a debt to a person unpaid and simply sacrifice to God. The second part sets out rules for the priests. The fire on the altar of burnt offering had to be kept burning and never go out, with wood added every morning. How the priests were to eat what was left of the grain and sin offerings is also laid down.',
    questions: [
      {
        type: 'choice',
        question: 'What was the order when someone had cheated a neighbour?',
        choices: [
          'First repay the owner with a fifth added, then bring the offering',
          'The offering alone is enough',
          'Offer first, repay later',
          'No repayment is needed',
        ],
        correctIndex: 0,
        explanation:
          'You could not leave a debt to a person standing and bring something to God instead.',
      },
      {
        type: 'choice',
        question: 'What was the rule about the fire on the altar?',
        choices: [
          'Keep it burning and add wood every morning',
          'It may go out at night',
          'Light it only at festivals',
          'There was no rule',
        ],
        correctIndex: 0,
        explanation:
          'It says, "The fire must be kept burning on the altar continuously; it must not go out."',
      },
      {
        type: 'choice',
        question: 'Which of these is NOT an example of the guilt offering here?',
        choices: [
          'Paying tax late',
          'Cheating over something entrusted to you',
          'Robbery',
          'Finding lost property and denying it',
        ],
        correctIndex: 0,
        explanation:
          'They are all matters concerning what belongs to someone else, and they are called sin against the LORD.',
      },
      {
        type: 'choice',
        question: 'What was the rule when a priest removed the ashes from the altar?',
        choices: [
          'Wear linen garments to remove them, then change and carry them outside the camp',
          'Any clothes would do',
          'The ashes were not removed',
          'The people removed them',
        ],
        correctIndex: 0,
        explanation:
          'The clothes worn in the holy place and those worn outside it were kept separate.',
      },
      {
        type: 'short',
        question: 'How much had to be added when repaying a wronged neighbour?',
        acceptedAnswers: ['a fifth', 'one fifth', '1/5', '20%'],
        explanation:
          'The property was returned to its owner with a fifth of its value added.',
      },
      {
        type: 'choice',
        question: 'Where did the priests eat what was left of the grain offering?',
        choices: ['In a holy place, the courtyard of the tent of meeting', 'At home', 'Anywhere', 'Outside the camp'],
        correctIndex: 0,
        explanation:
          'It was baked without yeast and eaten in a holy place.',
      },
      {
        type: 'choice',
        question: 'What principle does this chapter show?',
        choices: [
          'What you give to God and what you owe to people are not separate things',
          'That sacrifice alone is enough',
          'That restitution is optional',
          'That priests are exempt',
        ],
        correctIndex: 0,
        explanation:
          'Worship and honesty are bound together as one.',
      },
    ],
  },
  {
    book: 3,
    chapter: 7,
    summary:
      'The details of the guilt and fellowship offerings, and the priests’ portion. The fellowship offering divides into one brought in thanksgiving and one brought as a vow or a freewill gift. The thanksgiving offering had to be eaten the same day; a vow offering could be eaten the next day too, but anything left on the third day could not be eaten. Anyone who ate the fellowship offering while unclean was to be cut off from the people. The rule against eating fat and blood comes up again. The priests’ portion was the breast that was waved and the thigh that was presented, called "the portion of the anointing."',
    questions: [
      {
        type: 'choice',
        question: 'By when had a thanksgiving fellowship offering to be eaten?',
        choices: ['The same day', 'Within three days', 'Within a week', 'There was no limit'],
        correctIndex: 0,
        explanation:
          'A vow or freewill offering could be eaten the next day too, and anything left on the third day had to be burned.',
      },
      {
        type: 'choice',
        question: 'What was set aside as the priests’ portion?',
        choices: ['The breast that was waved and the thigh that was presented', 'The head and legs', 'The organs', 'Only the hide'],
        correctIndex: 0,
        explanation:
          'This was given as their regular share from the Israelites for ever.',
      },
      {
        type: 'choice',
        question: 'What happened to anyone who ate the fellowship offering while unclean?',
        choices: [
          'They were to be cut off from their people',
          'They paid a fine',
          'Nothing happened',
          'They offered the sacrifice again',
        ],
        correctIndex: 0,
        explanation:
          'It was a warning against handling holy things carelessly.',
      },
      {
        type: 'choice',
        question: 'Which prohibition is stressed again?',
        choices: ['Do not eat fat or blood', 'Do not eat meat', 'Do not eat bread', 'Do not drink water'],
        correctIndex: 0,
        explanation:
          'It is repeated from chapter 3 — a sign of how seriously it was taken.',
      },
      {
        type: 'short',
        question: 'What was brought along with the thanksgiving fellowship offering?',
        acceptedAnswers: ['unleavened bread', 'bread', 'unleavened and leavened bread', 'cakes'],
        explanation:
          'Unleavened cakes mixed with oil, unleavened wafers, and loaves of leavened bread as well.',
      },
      {
        type: 'choice',
        question: 'What was the priests’ portion called?',
        choices: [
          'The portion of the anointing',
          'A holy tax',
          'A gift of the people',
          'The altar’s share',
        ],
        correctIndex: 0,
        explanation:
          'It means the share they received from the day they were made priests.',
      },
      {
        type: 'choice',
        question: 'How many offerings are summed up in this chapter?',
        choices: [
          'Five — burnt, grain, sin, guilt and fellowship',
          'Two',
          'Three',
          'Seven',
        ],
        correctIndex: 0,
        explanation:
          'It closes by summing up the regulations for the five offerings covered in chapters 1–7.',
      },
    ],
  },
  {
    book: 3,
    chapter: 8,
    summary:
      'The ordination commanded in Exodus 29 actually takes place. Moses brings Aaron and his sons to the entrance of the tent of meeting and, in front of the whole assembly, washes them with water and dresses them. He fastens the ephod and breastpiece, puts the Urim and Thummim in place, sets on the turban and attaches the gold plate. He anoints the tabernacle and everything in it to make it holy, and pours oil on Aaron’s head. Then come the bull for the sin offering, the ram for the burnt offering and the ram of ordination, with blood put on the right earlobe, right thumb and right big toe. They are told not to leave the entrance for seven days, and they do as commanded.',
    questions: [
      {
        type: 'choice',
        question: 'Which chapter of Exodus is carried out here?',
        choices: ['Chapter 29 (the ordination of priests)', 'Chapter 20 (the Ten Commandments)', 'Chapter 25 (the tabernacle)', 'Chapter 32 (the golden calf)'],
        correctIndex: 0,
        explanation:
          'The Bible’s pattern of pairing command with execution shows up here too.',
      },
      {
        type: 'choice',
        question: 'What came first in the ordination?',
        choices: ['Washing with water', 'Putting on the garments', 'Anointing with oil', 'Offering sacrifices'],
        correctIndex: 0,
        explanation:
          'The order was: wash, clothe, anoint, sacrifice.',
      },
      {
        type: 'choice',
        question: 'Which three places was the blood put on?',
        choices: [
          'The right earlobe, the right thumb and the right big toe',
          'The forehead, the hand and the sole',
          'The chest, the back and the knee',
          'The eyes, the ears and the mouth',
        ],
        correctIndex: 0,
        explanation:
          'It means setting apart what he hears, what he does and where he walks.',
      },
      {
        type: 'short',
        question: 'How many days did the ordination last? (number only)',
        acceptedAnswers: ['7', 'seven', '7 days'],
        explanation:
          'They were told not to leave the entrance to the tent for seven days, and they did as they were told.',
      },
      {
        type: 'choice',
        question: 'What was distinctive about where the ordination took place?',
        choices: [
          'It was done in front of the whole assembly',
          'It was done in secret',
          'It was done at night',
          'It was done out in the desert',
        ],
        correctIndex: 0,
        explanation:
          'Moses gathered the assembly at the entrance to the tent and did it there. It was a public appointment.',
      },
      {
        type: 'choice',
        question: 'What was anointed with the oil?',
        choices: [
          'The tabernacle and everything in it, and Aaron’s head',
          'Only Aaron’s head',
          'Only the altar',
          'Only the garments',
        ],
        correctIndex: 0,
        explanation:
          'It was the sign of being set apart as holy.',
      },
      {
        type: 'choice',
        question: 'What does the last sentence of this chapter say?',
        choices: [
          'They did everything the LORD commanded',
          'The people complained',
          'The work stopped',
          'Aaron refused',
        ],
        correctIndex: 0,
        explanation:
          'It ends in obedience — and then trouble comes at once in chapter 10.',
      },
    ],
  },
  {
    book: 3,
    chapter: 9,
    summary:
      'After the seven days of ordination, on the eighth day Aaron leads the offerings as priest for the first time. He offers the sin offering and burnt offering for himself first, and only then the offerings for the people — dealing with his own sin before serving anyone else. When everything is done he lifts his hands and blesses the people, goes into the tent with Moses, comes out and blesses them again. Then the glory of the LORD appears to all the people, and fire comes out from before the LORD and consumes the offering on the altar. All the people see it, shout for joy and fall face down.',
    questions: [
      {
        type: 'choice',
        question: 'In what order did Aaron present the offerings?',
        choices: [
          'For himself first, then for the people',
          'For the people first',
          'Both at the same time',
          'He offered nothing for himself',
        ],
        correctIndex: 0,
        explanation:
          'He dealt with his own sin before serving anyone else.',
      },
      {
        type: 'choice',
        question: 'What happened when all the offerings were finished?',
        choices: [
          'The glory of the LORD appeared and fire came out and consumed the offering',
          'It rained',
          'Nothing happened',
          'There was an earthquake',
        ],
        correctIndex: 0,
        explanation:
          'It was not a fire people had lit; it came out from before the LORD.',
      },
      {
        type: 'choice',
        question: 'How did the people react to what they saw?',
        choices: ['They shouted for joy and fell face down', 'They ran away', 'They sang', 'They stayed silent'],
        correctIndex: 0,
        explanation:
          'When all the people saw it, they shouted for joy and fell face down.',
      },
      {
        type: 'choice',
        question: 'What did Aaron do when the offerings were finished?',
        choices: ['He lifted his hands and blessed the people', 'He went home', 'He cleaned the altar', 'He took off his garments'],
        correctIndex: 0,
        explanation:
          'He went into the tent of meeting with Moses, came out, and blessed the people again.',
      },
      {
        type: 'short',
        question: 'On which day after the ordination began did Aaron first serve? (number only)',
        acceptedAnswers: ['8', 'eight', 'the eighth', '8th'],
        explanation:
          'It was the eighth day, after the seven days of ordination were over.',
      },
      {
        type: 'choice',
        question: 'What does this chapter confirm?',
        choices: [
          'That God really did accept the offerings',
          'That Aaron made a mistake',
          'That the people disobeyed',
          'That the offerings were stopped',
        ],
        correctIndex: 0,
        explanation:
          'The fire that came out and consumed the offering was the sign that it was accepted.',
      },
      {
        type: 'choice',
        question: 'What did Moses tell the people?',
        choices: [
          'Today the LORD will appear to you',
          'Wait',
          'Leave',
          'He said nothing',
        ],
        correctIndex: 0,
        explanation:
          'He said that if they did as commanded, the glory of the LORD would appear to them.',
      },
    ],
  },
  {
    book: 3,
    chapter: 10,
    summary:
      'Right after the day of joy comes a heavy day. Aaron’s two sons Nadab and Abihu each take a censer, put unauthorised fire in it and offer incense before the LORD. Fire comes out from before the LORD and consumes them. Moses says to Aaron, "This is what the LORD spoke of," and Aaron is silent. Moses tells Aaron and his remaining sons not to let their hair go unkempt or tear their clothes in mourning, and not to leave the entrance to the tent. Then a rule is given: priests are not to drink wine or other fermented drink when they go into the tent of meeting.',
    questions: [
      {
        type: 'short',
        question: 'Which two sons of Aaron offered unauthorised fire before the LORD?',
        acceptedAnswers: ['Nadab and Abihu', 'Nadab, Abihu'],
        explanation:
          'Each took his censer, put unauthorised fire in it and offered incense.',
      },
      {
        type: 'choice',
        question: 'What happened to them?',
        choices: [
          'Fire came out from before the LORD and consumed them',
          'They were driven out',
          'They fell ill and died',
          'Nothing happened',
        ],
        correctIndex: 0,
        explanation:
          'The same fire that consumed the offering in chapter 9 consumes men here.',
      },
      {
        type: 'choice',
        question: 'How did Aaron react to the news?',
        choices: ['He remained silent', 'He wailed', 'He argued', 'He left'],
        correctIndex: 0,
        explanation:
          'It says only, "Aaron remained silent." It was a place beyond words.',
      },
      {
        type: 'choice',
        question: 'What rule was given to the priests after this?',
        choices: [
          'Do not drink wine or other fermented drink when you enter the tent of meeting',
          'Serve only at night',
          'Change your garments',
          'Offer fewer sacrifices',
        ],
        correctIndex: 0,
        explanation:
          'It was so they could distinguish between the holy and the common, the unclean and the clean.',
      },
      {
        type: 'choice',
        question: 'What did Moses forbid Aaron and his remaining sons to do?',
        choices: [
          'Let their hair go unkempt or tear their clothes in mourning',
          'Eat',
          'Speak',
          'Offer sacrifices',
        ],
        correctIndex: 0,
        explanation:
          'As anointed men they were not to leave the entrance to the tent of meeting.',
      },
      {
        type: 'choice',
        question: 'What does this chapter say?',
        choices: [
          'That people cannot decide for themselves how to come to God',
          'That sacrifices are unnecessary',
          'That priests are never punished',
          'That fire is dangerous',
        ],
        correctIndex: 0,
        explanation:
          'The heart of it is in the phrase "unauthorised fire, which he had not commanded them."',
      },
      {
        type: 'choice',
        question: 'What word did Moses bring to Aaron?',
        choices: [
          'Among those who approach me I will be proved holy',
          'I will forgive',
          'This will never happen again',
          'Nothing was said',
        ],
        correctIndex: 0,
        explanation:
          'The nearer the place of service, the more strictly holiness was treated.',
      },
    ],
  },
  {
    book: 3,
    chapter: 11,
    summary:
      'Rules for telling apart what may and may not be eaten. Among land animals, only those with a divided hoof that also chew the cud — which ruled out the camel and the pig. From the water, only what has fins and scales; among birds, creatures like the eagle and the falcon were excluded. The purpose comes at the end: "I am the LORD your God. Be holy, because I am holy." What a person ate became a daily reminder of whose they were.',
    questions: [
      {
        type: 'choice',
        question: 'What made a land animal fit to eat?',
        choices: [
          'A divided hoof and chewing the cud',
          'A divided hoof only',
          'Chewing the cud only',
          'Being large',
        ],
        correctIndex: 0,
        explanation:
          'Both were needed. The camel chews the cud but has no divided hoof; the pig has a divided hoof but does not chew the cud.',
      },
      {
        type: 'choice',
        question: 'What made a water creature fit to eat?',
        choices: ['Having fins and scales', 'Being large', 'Living in fresh water', 'There was no rule'],
        correctIndex: 0,
        explanation:
          'Anything without fins and scales was to be regarded as detestable.',
      },
      {
        type: 'short',
        question: 'The purpose is given at the end: "Be ____, because I am ____."',
        acceptedAnswers: ['holy', 'be holy'],
        explanation:
          'What a person ate became a daily reminder of whose they were.',
      },
      {
        type: 'choice',
        question: 'Which animals are given as examples of what may not be eaten?',
        choices: ['The camel and the pig', 'The ox and the sheep', 'The goat and the deer', 'The chicken and the duck'],
        correctIndex: 0,
        explanation:
          'The camel, the hyrax and the rabbit chew the cud but have no divided hoof; the pig is the other way round.',
      },
      {
        type: 'choice',
        question: 'What does this rule cover?',
        choices: [
          'Land animals, water creatures, birds and creatures that move along the ground',
          'Land animals only',
          'Fish only',
          'Birds only',
        ],
        correctIndex: 0,
        explanation:
          'It covers every realm of living things and gives a standard for telling them apart.',
      },
      {
        type: 'choice',
        question: 'What did this rule do in everyday life?',
        choices: [
          'It brought to mind, at every meal, whose they were',
          'It protected their health',
          'It saved money',
          'It helped their farming',
        ],
        correctIndex: 0,
        explanation:
          'Holiness was not a matter for special days; it started at the dinner table.',
      },
      {
        type: 'choice',
        question: 'Where does Leviticus 11 stand in the book?',
        choices: [
          'Everyday rules coming after the rules for offerings',
          'Rules that come before the offerings',
          'Rules for war',
          'Rules for festivals',
        ],
        correctIndex: 0,
        explanation:
          'The flow runs from worship at the tabernacle right through to the dinner table.',
      },
    ],
  },
];
