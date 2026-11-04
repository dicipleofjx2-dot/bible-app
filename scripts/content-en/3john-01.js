/**
 * 성경통독도우미 콘텐츠 (English) — 3john-01
 *
 * scripts/bilingual/ 의 원고에서 자동으로 만들어진 파일이다.
 * **여기를 고치지 말고 원고를 고쳐서 다시 쪼갤 것** — 두 언어의 자리가 어긋난다.
 *
 * memoryVerse 는 한글 파일에만 있다. 영어 본문은 앱이 쓰는 성경(open_en)에서
 * 그대로 가져오므로 여기서 옮기지 않는다.
 */

module.exports = [
  {
    book: 64,
    chapter: 1,
    summary:
      'The elder writes to beloved Gaius, whom he truly loves. He prays that Gaius may prosper in all things and be in good health, just as his soul prospers. Brothers came and testified to Gaius’s faithfulness to the truth, how he walks in the truth, and the elder rejoiced greatly; he has no greater joy than to hear that his children are walking in the truth. Gaius was acting faithfully in what he did for the brothers who were strangers, and they testified to his love before the church. They had gone out for the sake of the Name, accepting nothing from the Gentiles, so Gaius will do well to send them on their way in a manner worthy of God. We ought to support such people, so that we may be fellow workers for the truth. But Diotrephes, who loves to be first among them, does not acknowledge the elder’s authority; he speaks wicked words against them, refuses to welcome the brothers, and stops those who want to, putting them out of the church. The elder says that if he comes he will bring up what Diotrephes is doing. “Do not imitate what is evil but what is good.” He commends Demetrius, who has a good testimony from everyone and from the truth itself. He has much more to write but hopes to see Gaius soon and talk face to face. Peace be to you; the friends greet you.',
    questions: [
      {
        type: 'choice',
        question: 'Who receives this letter?',
        choices: ['Beloved Gaius', 'The elect lady', 'Diotrephes', 'Philemon'],
        correctIndex: 0,
        explanation: 'It opens, “The elder to the beloved Gaius, whom I love in truth.”',
      },
      {
        type: 'choice',
        question: 'What does the elder pray for Gaius?',
        choices: [
          'That he prosper in all things and be healthy, as his soul prospers',
          'That he be released from prison',
          'That he become first in the church',
          'That he travel to a distant land',
        ],
        correctIndex: 0,
        explanation: 'He prays that Gaius may prosper and be in health, just as his soul prospers.',
      },
      {
        type: 'choice',
        question: 'What does the elder say is his greatest joy?',
        choices: [
          'Hearing that his children walk in the truth',
          'Having many followers',
          'Receiving many letters',
          'Traveling',
        ],
        correctIndex: 0,
        explanation: '“I have no greater joy than to hear that my children are walking in the truth.”',
      },
      {
        type: 'choice',
        question: 'Why should they support the traveling brothers?',
        choices: [
          'So that we may be fellow workers for the truth',
          'Because they have much money',
          'Because they are the elder’s relatives',
          'Because they received much from the Gentiles',
        ],
        correctIndex: 0,
        explanation:
          'They went out for the Name and took nothing from the Gentiles; supporting them makes us fellow workers for the truth.',
      },
      {
        type: 'choice',
        question: 'Who loved to be first and refused to welcome the elder and the brothers?',
        choices: ['Diotrephes', 'Demetrius', 'Gaius', 'Alexander'],
        correctIndex: 0,
        explanation:
          'Diotrephes slandered them, refused the brothers, and put those who welcomed them out of the church.',
      },
      {
        type: 'choice',
        question: 'What exhortation does the elder give Gaius?',
        choices: [
          'Do not imitate evil but imitate good',
          'Follow Diotrephes',
          'Keep away from strangers',
          'Leave the church',
        ],
        correctIndex: 0,
        explanation: 'He adds that whoever does good is from God, and whoever does evil has not seen God.',
      },
      {
        type: 'choice',
        question: 'Who is commended as having a good testimony from everyone and from the truth?',
        choices: ['Demetrius', 'Diotrephes', 'Titus', 'Silas'],
        correctIndex: 0,
        explanation:
          'Demetrius is well spoken of by all and by the truth itself, and the elder adds his own testimony.',
      },
    ],
  },
];
