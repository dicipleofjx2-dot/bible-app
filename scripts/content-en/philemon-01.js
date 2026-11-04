/**
 * 성경통독도우미 콘텐츠 (English) — philemon-01
 *
 * scripts/bilingual/ 의 원고에서 자동으로 만들어진 파일이다.
 * **여기를 고치지 말고 원고를 고쳐서 다시 쪼갤 것** — 두 언어의 자리가 어긋난다.
 *
 * memoryVerse 는 한글 파일에만 있다. 영어 본문은 앱이 쓰는 성경(open_en)에서
 * 그대로 가져오므로 여기서 옮기지 않는다.
 */

module.exports = [
  {
    book: 57,
    chapter: 1,
    summary:
      'Paul, a prisoner of Christ Jesus, and Timothy our brother write to Philemon, beloved fellow worker, to Apphia our sister, to Archippus our fellow soldier, and to the church in Philemon’s house. Paul always thanks God when he prays for Philemon, hearing of his love and faith toward the Lord Jesus and all the saints. The hearts of the saints have been refreshed through him, and Paul has received much joy and comfort from his love. Though bold enough in Christ to command what is fitting, Paul instead appeals on the basis of love — as an aged man and now a prisoner — for his son Onesimus, whom he begot in his imprisonment. Onesimus was once useless to Philemon but is now useful to both of them, and Paul sends him back, his very heart. Paul would have liked to keep him to serve him in prison, but did not want to do anything without Philemon’s consent, so that his goodness would be voluntary, not forced. Perhaps he was separated for a while so that Philemon might have him back forever — no longer as a servant but more than a servant, a beloved brother. “Receive him as you would receive me.” If he has wronged Philemon or owes anything, charge it to Paul’s account; Paul writes with his own hand that he will repay. Confident that Philemon will do even more than he asks, Paul asks him to prepare a guest room, and passes on greetings from Epaphras, Mark, Aristarchus, Demas and Luke.',
    questions: [
      {
        type: 'choice',
        question: 'Whom does Paul call “our fellow soldier” among the recipients?',
        choices: ['Archippus', 'Apphia', 'Timothy', 'Onesimus'],
        correctIndex: 0,
        explanation: 'The letter was also addressed to the church in Philemon’s house.',
      },
      {
        type: 'choice',
        question: 'Instead of commanding, on what basis does Paul appeal to Philemon?',
        choices: ['On the basis of love', 'By apostolic authority', 'By the law', 'By Roman law'],
        correctIndex: 0,
        explanation: 'He could have commanded but preferred to appeal in love.',
      },
      {
        type: 'choice',
        question: 'Whom does Paul call the son he begot in his imprisonment?',
        choices: ['Onesimus', 'Timothy', 'Epaphras', 'Mark'],
        correctIndex: 0,
        explanation: 'Paul calls him his very heart and sends him back.',
      },
      {
        type: 'choice',
        question: 'How had Onesimus changed?',
        choices: [
          'Once useless, now useful',
          'Once rich, now poor',
          'Once sick, now healed',
          'Once free, now a slave',
        ],
        correctIndex: 0,
        explanation: 'He is now useful to both Paul and Philemon.',
      },
      {
        type: 'choice',
        question: 'Why did Paul not want to do anything without Philemon’s consent?',
        choices: [
          'So that his goodness would be voluntary, not forced',
          'Because he feared Philemon',
          'Because he did not want Onesimus',
          'Because Timothy objected',
        ],
        correctIndex: 0,
        explanation: 'Paul wanted to keep Onesimus but respected Philemon’s choice.',
      },
      {
        type: 'choice',
        question: 'How did Paul want Philemon to receive Onesimus now?',
        choices: [
          'More than a servant — as a beloved brother',
          'As a punished servant',
          'As a stranger',
          'As Paul’s servant',
        ],
        correctIndex: 0,
        explanation: 'He was to receive him as he would receive Paul.',
      },
      {
        type: 'choice',
        question: 'What did Paul say to do if Onesimus owed anything?',
        choices: [
          'Charge it to Paul’s account',
          'Make Onesimus work it off',
          'Have the church pay it',
          'Take him to court',
        ],
        correctIndex: 0,
        explanation: 'Paul writes with his own hand that he will repay it.',
      },
    ],
  },
];
