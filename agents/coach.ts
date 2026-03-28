export interface CoachMessage {
  message: string;
  emoji: string;
}

const COACH_MESSAGES: CoachMessage[] = [
  { message: "The puppies are still waiting on that other tab!", emoji: "🐾" },
  { message: "Did you just switch tabs? The homeless kittens noticed.", emoji: "😿" },
  { message: "Your future self, who volunteered, is laughing at you right now.", emoji: "😂" },
  { message: "Breaking news: Local charity still exists while you browse memes.", emoji: "📰" },
  { message: "Plot twist: The tab you abandoned has feelings too.", emoji: "💔" },
  { message: "The orphaned bunnies called. They're disappointed.", emoji: "🐰" },
  { message: "Achievement unlocked: Tab Abandoner. Not your finest hour.", emoji: "🏆" },
  { message: "Meanwhile, in a parallel universe where you didn't switch tabs...", emoji: "🌍" },
];

export function getCoachMessage(): CoachMessage {
  return COACH_MESSAGES[Math.floor(Math.random() * COACH_MESSAGES.length)];
}

export function getTabReturnMessage(): string {
  const messages = [
    "Welcome back, hero! The charities missed you. (Mostly.)",
    "You returned! We knew you had it in you. (Eventually.)",
    "Look who came crawling back. We're not mad. Just... disappointed. (Kidding, we love you!)",
    "The prodigal volunteer returns! Break out the metaphorical fatted calf!",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
