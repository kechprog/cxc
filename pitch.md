# [Project Name TBD] — Pitch & Product Reference

## One-Liner

A passive emotional intelligence layer for your conversations — because you don't always know how you feel, but your voice does.

## The Problem

People are bad at recognizing their own emotions in real time. You leave a meeting not realizing you were anxious. You hang up a call not noticing you shut down halfway through. This is literally why therapists exist — they catch what you can't. But therapy covers one hour a week. The other 100+ hours of conversation go unexamined.

Current tools don't help. Journaling is retroactive and filtered through your own blind spots. Mood trackers rely on self-reporting, which is exactly the problem. Chat-based AI can only analyze what you *type*, not how you *feel*.

## The Solution

An app that passively listens to your conversations (with consent), analyzes your emotional state in real time using **vocal features** (pitch, volume, pace, tone — not just words), and surfaces insights you'd never catch yourself.

### How It Works — Three Layers

**Layer 1: Real-Time Audio Analysis**
- Continuous speaker diarization (who is speaking when)
- A custom sentiment model that runs on audio features — pitch, volume, speaking pace, pauses, vocal tension
- Outputs a continuous emotional signal per speaker, like a heartbeat monitor for mood
- This is the core technical differentiator: your voice reveals what your words hide

**Layer 2: Per-Conversation LLM Analysis**
- After a conversation ends, the transcript is enriched with the emotional annotations:
  ```
  You: "No yeah I'm totally fine with that" (anxiety: 0.72, frustration: 0.45)
  Other: "Great, so we'll go with my plan then" (confidence: 0.81)
  You: "Sounds good" (resignation: 0.63)
  ```
- An LLM reads the annotated transcript and produces:
  - An emotional arc summary ("You started confident but became increasingly anxious after the budget topic came up")
  - Flagged moments where vocal sentiment contradicts spoken words
  - Key emotional shifts and likely triggers

**Layer 3: Cross-Conversation Pattern Detection (RAG)**
- Each conversation analysis is stored and indexed
- Over time, the user can chat with the AI about patterns across all their conversations
- The AI can surface insights the user never noticed:
  - "You consistently show signs of stress when discussing deadlines with Speaker B"
  - "Your confidence drops in group settings vs. 1-on-1"
  - "You seem to shut down after disagreements rather than addressing them"
- This is the "therapist layer" — longitudinal pattern recognition across weeks or months of data

## Bidirectional Emotional Tracking

The app tracks sentiment for **all speakers**, not just the user. This is a critical design choice grounded in a simple truth: you don't live in a vacuum.

Therapy addresses two directions of emotional harm:
- **Inward:** Your own unrecognized stress, anxiety, avoidance patterns
- **Outward:** How your behavior affects the people around you — often without you realizing it

Most self-improvement tools only look inward. This app does both.

**Example:** You call your friend stupid because you assume they don't care. But the model detects hurt in their voice — their pitch drops, they go quiet, their energy flatlines for the rest of the conversation. You didn't notice in the moment. The AI did.

The post-conversation summary flags this: "After your comment at 4:32, Speaker B's emotional tone shifted from engaged to withdrawn for the remaining 8 minutes. You may not have intended this — consider checking in with them."

**What this enables:**
- "You tend to get sarcastic when you're frustrated — here's how it lands on the other person"
- "Speaker B's anxiety consistently rises when you bring up plans last-minute"
- "You think you're being direct, but the other speaker's vocal patterns suggest they experience it as aggressive"

This is the insight most people never get without a therapist or a very honest friend. The app becomes a mirror for how you show up in other people's experience, not just your own.

## User Experience

1. User enables recording for a conversation (phone call, in-person, meeting)
2. During the conversation, the app runs diarization and audio sentiment in the background
3. After the conversation, the user sees:
   - A timeline visualization of their emotional state (like a heart rate graph)
   - An AI-generated summary highlighting key emotional moments
   - Flagged "blind spot" moments where words and feelings diverged
4. Over time, the user builds a library of analyzed conversations
5. A chat interface lets them ask questions across their history:
   - "How do I usually feel after calls with my manager?"
   - "When do I tend to get defensive?"
   - "Am I getting better at staying calm in disagreements?"

## User Profile & Dynamic Memory

### Onboarding Interview

On first launch (before any recording), the app conducts a brief conversational interview to build an initial user profile. This isn't a static form — it's an AI-guided conversation that adapts its questions based on previous answers.

**What we collect and why:**

| Category | Example Questions | Why It Matters |
|---|---|---|
| Relationships & Social Context | "Who do you talk to most? What's your relationship?" | So the AI can contextualize dynamics ("you get tense with authority figures" vs "you get tense with everyone") |
| Emotional Self-Awareness Baseline | "How would you describe your communication style?" "Do people ever tell you you seem stressed when you don't feel stressed?" | Establishes the user's own blind spots as a starting point — the AI can later say "you said you're usually calm in conflict, but your data shows otherwise" |
| Goals | "What are you hoping to learn about yourself?" "Any relationships or situations you want to improve?" | Focuses the AI's analysis and suggestions on what the user actually cares about |
| Known Triggers & Sensitivities | "Are there topics that tend to stress you out?" "Any situations where you feel you don't show up as your best self?" | Gives the AI prior knowledge so it can watch for these patterns from day one rather than needing weeks of data |
| Context (work, lifestyle) | "What does a typical day look like for you?" "Do you have a lot of meetings/calls?" | Helps the AI distinguish "stressed because of a bad conversation" from "stressed because it's 5pm on a Friday and you're exhausted" |

The interview should feel light and conversational — not clinical. Think 2-3 minutes, not a 20-question intake form.

### Dynamic User Memory

The user profile is **not static**. It evolves in two ways:

**1. AI-Updated Memory (Passive)**
As the app analyzes more conversations, it automatically updates its understanding of the user:
- Discovers recurring emotional patterns the user didn't mention ("User becomes avoidant when discussing finances — not listed in initial triggers")
- Refines its model of relationships ("User's interactions with Speaker B have shifted from positive to tense over the past 3 weeks")
- Tracks emotional baselines over time ("User's average anxiety level has decreased by 15% this month")
- Learns the user's unique vocal emotional signatures (some people get quiet when angry, others get loud — the model adapts)

**2. User-Edited Memory (Active)**
The user can also directly update their profile at any time:
- Correct the AI ("That person isn't my manager, that's my friend")
- Add new context ("I just started a new job" / "I'm going through a breakup")
- Set new goals ("I want to focus on being more assertive")
- Remove or restrict topics ("Stop tracking conversations about X")

### How Memory Flows Into Analysis

The dynamic memory doesn't just sit in a profile page — it actively shapes every output:

- **Per-conversation summaries** reference the user's goals and known patterns: "You mentioned wanting to be more assertive — in this conversation, you deferred to the other speaker 4 times when your tone suggested disagreement"
- **Pattern detection** builds on the baseline: "Compared to your first week, you're holding your ground longer in disagreements before your anxiety spikes"
- **Suggestions become personalized**: instead of generic advice like "try to be more aware of your stress," the AI can say "the last 3 times you talked to [Speaker B] about deadlines, you agreed to timelines you weren't comfortable with — next time, try pausing before responding"

### Therapy & Psychology Knowledge Base (RAG)

In addition to the user's personal conversation history, the LLM has access to a second RAG source: a curated knowledge base of therapeutic frameworks, psychology research, and communication science. This is what separates the app from a mood tracker that just shows you graphs — it can actually *help*.

**What's in the knowledge base:**
- Established therapeutic frameworks (CBT techniques, DBT skills, motivational interviewing principles, attachment theory patterns)
- Communication science (active listening techniques, nonviolent communication, de-escalation strategies)
- Emotional regulation research (grounding techniques, cognitive reframing patterns)
- Relationship dynamics patterns (pursuer-withdrawer cycles, conflict escalation patterns, power dynamics)
- Workplace psychology (negotiation tactics, assertiveness frameworks, burnout indicators)

**How it's used:**
The LLM doesn't just tell you what happened — it draws on this knowledge base to explain *why* and suggest *what to do next*. Examples:

- **Without knowledge base:** "You showed anxiety when the topic of performance reviews came up"
- **With knowledge base:** "You showed anxiety when performance reviews came up. This pattern is consistent with anticipatory anxiety — a common response where the stress of *expecting* criticism is often worse than the criticism itself. A CBT approach here would be to identify the specific thought driving the anxiety. Next time, try asking yourself: what's the worst realistic outcome?"

- **Without knowledge base:** "You tend to agree with Speaker B even when your tone suggests disagreement"
- **With knowledge base:** "You tend to defer to Speaker B despite showing signs of frustration. This looks like a conflict-avoidant pattern — common and not a character flaw. Research on assertiveness suggests starting with low-stakes disagreements to build the muscle. In your next conversation with them, try expressing one small preference you'd normally let go."

**Key principle:** The app is NOT a therapist and does not diagnose or treat. The knowledge base enables *psychologically informed suggestions* grounded in established research, not clinical advice. This distinction should be clear in the UI and in the pitch.

### Memory Privacy

- All memory is local to the user's account
- The user can view, edit, or delete any piece of stored memory at any time
- The AI is transparent about what it "knows" — the user can ask "what do you know about me?" and get a full readout

## Privacy Model

- Recording is entirely user-initiated — the user is responsible for obtaining consent from other participants
- Liability for recording sits with the user, not the app
- The app does not share, transmit, or store audio beyond the user's own device/account
- This is the same model used by voice memo apps and call recorders

## Technical Architecture (High Level)

| Component | Role |
|---|---|
| Speaker Diarization | Segments audio by speaker in real time |
| Custom Audio Sentiment Model | Classifies emotion from vocal features (pitch, volume, pace, tone) per segment |
| Speech-to-Text | Generates transcript aligned with diarization |
| Annotation Engine | Merges transcript + sentiment scores into enriched format |
| Per-Conversation LLM | Analyzes single annotated conversation, produces summary + flagged moments |
| Vector Store / RAG | Indexes all conversation analyses for cross-conversation retrieval |
| Chat Interface | User queries their conversation history through natural language |

## Demo Strategy

The demo should center on **one powerful moment**: a live (or pre-recorded) conversation where someone says something positive but the audio sentiment model catches a negative emotion underneath. For example:

- "No, I'm fine with that" → model flags anxiety at 0.7
- Show the emotional timeline spiking at that exact moment
- Then show the LLM summary calling it out: "You agreed verbally but showed signs of discomfort"

This is the "wow" moment. Build the entire demo around making this single moment as clear and visceral as possible.

### Pitch Flow (3 minutes)

1. **The hook** (20 sec): "You don't always know how you feel. But your voice does."
2. **The problem** (30 sec): People miss their own emotional signals. Self-reporting is broken. Therapists catch this — but only 1 hour a week.
3. **Live demo** (90 sec): Show a conversation being analyzed. Highlight the moment where words and voice diverge. Show the emotional timeline. Show the AI summary.
4. **The long game** (20 sec): Show the RAG chat — "over the past 2 weeks, you consistently get anxious when money comes up"
5. **Close** (20 sec): "Your voice already knows how you feel. We just help you listen."

## Judging Criteria Alignment

| Criteria | How We Hit It |
|---|---|
| Innovation | Passive voice-based emotional intelligence is not available in consumer tools today |
| Technical Complexity | Custom audio sentiment model + diarization + annotated LLM pipeline + RAG — not a 1-prompt project |
| Real-World Application | Universal — anyone who talks to people can use this. Mental health, professional development, relationships |
| "Wow" Factor | The moment the model catches an emotion your words hid is visceral and immediately relatable |
| Time | Scoped to be achievable in 36 hours with the right stack choices |

## Prize Tracks

- **Best Audio Hack** — primary track, perfect fit
- **Best AI for Good** — mental health, self-awareness, emotional intelligence framing

## Sponsor Relevance

- **Tangerine / Equitable / KPMG / Accenture**: Frame as a tool for professional development — understanding your emotional patterns in client calls, negotiations, team dynamics
- **Conrad School**: Entrepreneurship angle — founders who need to be self-aware in investor pitches, co-founder dynamics
- **Around HI**: Direct mental health / wellbeing alignment