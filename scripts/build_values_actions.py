#!/usr/bin/env python3
"""Build the static, curated Values WHAT/HOW suggestion library."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "site" / "data" / "skill-apps" / "values-actions.json"


def idea(what: str, tags: str, *hows: str) -> tuple[str, list[str], list[str]]:
    return what, tags.split(), list(hows)


IDEAS = {
    "close-relationships": [
        idea("Reconnect with an old relationship.", "connection courage friendship", "Send one person a simple message asking how they have been.", "Look up one person's contact details and draft a two-sentence note.", "Suggest a short call, coffee, or walk with no pressure attached."),
        idea("Strengthen an important close relationship.", "connection love commitment", "Set aside twenty phone-free minutes to talk this week.", "Ask one open question and listen without trying to fix anything.", "Name one thing you appreciate about the relationship."),
        idea("Make more room for family connection.", "connection family care", "Invite one family member to share a meal or call.", "Start a small recurring ritual such as a Sunday check-in.", "Send a photo or memory with a short note."),
        idea("Repair a manageable relationship strain.", "courage accountability forgiveness", "Write down the impact you want to acknowledge before speaking.", "Ask whether the person is open to a short conversation.", "Offer one specific apology or repair without demanding a response."),
        idea("Express care more visibly.", "care affection warmth", "Send a thoughtful check-in to someone having a hard week.", "Do one ordinary helpful task you know would lighten their load.", "Say one caring thing you often assume is already understood."),
        idea("Practice clearer boundaries with people I love.", "respect honesty autonomy", "Write one boundary in a calm one-sentence form.", "Choose a low-stakes situation in which to practice saying no.", "Ask for time to think before agreeing to a request."),
        idea("Share responsibilities more fairly.", "fairness responsibility cooperation", "List the recurring tasks that currently need attention.", "Ask for a ten-minute conversation about one uneven responsibility.", "Agree on one small responsibility to redistribute for a week."),
        idea("Be more present during time together.", "presence mindfulness attentiveness", "Put devices out of reach during one conversation or meal.", "Notice when attention drifts and gently return to the person.", "Choose one shared activity and give it your full attention."),
        idea("Create more warmth at home.", "warmth kindness welcoming", "Greet the people you live with before starting another task.", "Make one shared space comfortable for a relaxed conversation.", "Offer a small gesture of welcome when someone arrives."),
        idea("Support a caregiver or family member.", "care compassion service", "Ask what kind of practical help would actually be useful.", "Offer one bounded task you can realistically complete.", "Schedule a short check-in that also respects your own limits."),
        idea("Talk about something that matters to me.", "courage honesty intimacy", "Write down the main point and one feeling before the conversation.", "Choose a calm time and ask whether now is a good moment.", "Begin with one honest sentence rather than the whole story."),
        idea("Build trust through follow-through.", "trust reliability integrity", "Complete one small promise by the time you agreed.", "Renegotiate one commitment early if you cannot meet it.", "Record an important promise somewhere you will see it."),
        idea("Make affection fit the relationship.", "affection love sensitivity", "Ask what kinds of affection feel welcome to the other person.", "Offer a sincere compliment about character or effort.", "Create one small affectionate ritual that respects everyone's comfort."),
        idea("Protect time for a partnership.", "commitment intimacy balance", "Reserve one hour for a shared activity this week.", "Take turns choosing a simple low-cost activity.", "Discuss one distraction you both want to reduce during that time."),
        idea("Learn more about someone close to me.", "curiosity understanding connection", "Ask what has been taking most of their attention lately.", "Invite them to tell a story you have never heard.", "Reflect back what you heard before sharing your own view."),
    ],
    "friendship": [
        idea("Strengthen a current friendship.", "friendship connection commitment", "Invite one friend to coffee, a walk, or a short call this week.", "Send a message referring to something they care about.", "Put the next check-in on your calendar before you part."),
        idea("Meet people around a shared interest.", "curiosity friendship belonging", "Find one local or online group with a clear upcoming event.", "Attend once with the goal of saying hello to one person.", "Ask one participant what they enjoy about the group."),
        idea("Be a more attentive friend.", "attentiveness care empathy", "Ask one follow-up question about something a friend mentioned before.", "Listen for five minutes without changing the subject to your experience.", "Write down an important date or detail so you can remember it."),
        idea("Make social plans easier to start.", "connection proactivity simplicity", "Offer two specific times instead of asking an open-ended question.", "Suggest a short, low-cost plan close to home.", "Send one invitation before the end of today."),
        idea("Reconnect after a quiet period.", "courage friendship openness", "Send a no-blame message saying you would enjoy reconnecting.", "Share one small update and ask how they are.", "Suggest a brief call without requiring an explanation for the gap."),
        idea("Build more reciprocal friendships.", "reciprocity fairness connection", "Notice one friendship where you can ask for support as well as offer it.", "Thank a friend for a specific way they showed up.", "Check whether the pace of contact works for both of you."),
        idea("Practice friendliness in ordinary moments.", "friendliness warmth openness", "Make eye contact and greet one familiar person by name.", "Ask a neighbour or colleague one low-pressure question.", "Offer a sincere thank-you during an everyday interaction."),
        idea("Share more play and enjoyment with others.", "fun playfulness joy", "Invite someone to a game, comedy, or playful activity.", "Send one amusing but considerate message or memory.", "Choose an activity where nobody needs to perform well."),
        idea("Deepen one friendship gradually.", "intimacy trust honesty", "Share one slightly more personal thought with a trusted friend.", "Ask a meaningful question and allow silence for the answer.", "Name that you value the friendship."),
        idea("Create a small social routine.", "consistency connection reliability", "Choose a monthly breakfast, walk, or call with one friend.", "Set a reminder to propose the next date.", "Keep the routine short enough to be realistic."),
        idea("Include someone who may feel left out.", "inclusiveness kindness welcoming", "Invite one person into an existing low-pressure activity.", "Introduce two people by naming a shared interest.", "Check that plans are accessible before finalizing them."),
        idea("Handle a friendship disagreement respectfully.", "respect courage understanding", "Write the issue as an observation rather than an accusation.", "Ask for the friend's perspective before proposing a solution.", "Agree on one small next step or a time to revisit it."),
        idea("Broaden my social world without overloading myself.", "exploration balance connection", "Choose one event lasting an hour or less.", "Attend with permission to leave after one meaningful interaction.", "Ask a friend to join you for the first visit."),
        idea("Offer practical support to a friend.", "service care generosity", "Ask whether listening or practical help would be more useful.", "Offer one specific task with a clear limit.", "Follow up once at the time you said you would."),
        idea("Let friends know me more accurately.", "authenticity honesty individuality", "Share one genuine preference instead of automatically agreeing.", "Tell a trusted friend what has been important to you lately.", "Practice a respectful disagreement on a low-stakes topic."),
    ],
    "work-education": [
        idea("Make progress on one meaningful work or study priority.", "focus effectiveness contribution", "Choose the next visible action and work on it for twenty-five minutes.", "Close unrelated tabs and put the needed materials in front of you.", "Send a brief progress update when the work block ends."),
        idea("Learn a useful skill for my role.", "learning competence growth", "Choose one tutorial, chapter, or lesson and schedule thirty minutes.", "Practice the skill on a small real example.", "Ask one knowledgeable person for a recommended starting resource."),
        idea("Contribute more clearly in meetings or classes.", "courage contribution communication", "Write down one point or question before the next meeting.", "Speak once during the first half of the discussion.", "Send a concise follow-up if speaking live is not practical."),
        idea("Improve the quality of a recurring task.", "excellence improvement thoroughness", "Identify one recurring error or friction point.", "Create a three-step checklist for the next attempt.", "Ask for feedback on one specific aspect of the result."),
        idea("Build a more sustainable work rhythm.", "balance self-care discipline", "Block one protected break in tomorrow's schedule.", "Choose a realistic stopping time for one workday.", "Group one type of routine task into a single work block."),
        idea("Clarify expectations on an assignment.", "clarity responsibility communication", "Write the three questions that would reduce uncertainty most.", "Ask the relevant person to confirm the desired outcome and deadline.", "Summarize your understanding in a short follow-up message."),
        idea("Strengthen professional reliability.", "reliability integrity timeliness", "Review upcoming commitments and flag one risk early.", "Finish one promised small deliverable before starting optional work.", "Put the next deadline and reminder in your calendar."),
        idea("Explore a possible education or career direction.", "curiosity exploration purpose", "Read one first-person account of the role or program.", "List three questions for an informational conversation.", "Spend thirty minutes comparing two realistic options."),
        idea("Ask for useful feedback.", "growth openness courage", "Choose one piece of work and ask one specific question about it.", "Listen and write down the feedback before responding.", "Try one small change and compare the result."),
        idea("Support a colleague or classmate.", "cooperation kindness service", "Offer help on one bounded task you can genuinely take on.", "Share a useful resource with a brief explanation.", "Ask what would help rather than assuming."),
        idea("Organize a confusing project.", "organization clarity effectiveness", "Write the desired outcome at the top of a page.", "List the next three concrete actions in order.", "Identify one question or dependency that blocks progress."),
        idea("Protect time for focused work.", "focus discipline autonomy", "Reserve one thirty-minute block and silence notifications.", "Tell collaborators when you will next be available.", "Keep a note nearby for unrelated thoughts instead of switching tasks."),
        idea("Connect daily work with contribution.", "meaning contribution purpose", "Write one sentence about who benefits from the work.", "Choose one task that has a clear useful outcome.", "Ask a recipient what would make the result more helpful."),
        idea("Practice ethical judgment at work or school.", "ethics integrity responsibility", "Name the people who may be affected by one decision.", "Check one relevant policy or professional standard.", "Raise one concern through an appropriate, low-risk channel."),
        idea("Recognize progress without requiring perfection.", "appreciation excellence self-compassion", "Write down three things completed or learned this week.", "Define 'good enough for this version' before starting.", "Share a draft early enough to improve it."),
    ],
    "health": [
        idea("Build a gentler movement routine.", "fitness vitality consistency", "Take a ten-minute walk at a comfortable pace.", "Choose one short movement video suited to your current ability.", "Put comfortable shoes or equipment where you will see them."),
        idea("Make sleep routines more supportive.", "self-care balance wellbeing", "Choose one consistent wind-down cue for tonight.", "Move one stimulating activity earlier by thirty minutes.", "Prepare the bedroom for comfort before you feel tired."),
        idea("Eat with more regularity and attention.", "self-care mindfulness health", "Plan one simple meal or snack before the busiest part of the day.", "Sit down for the first five minutes without another screen.", "Add one accessible food that helps the meal feel sustaining."),
        idea("Keep up with ordinary preventive care.", "responsibility self-care preparedness", "Check when one routine appointment or prescription is due.", "Put the clinic or pharmacy number in your phone.", "Schedule one appropriate routine appointment or reminder."),
        idea("Create a realistic rest break.", "balance self-care moderation", "Set a ten-minute timer and stop productive tasks when it rings.", "Choose one form of rest that does not require preparation.", "Tell others when you will be available again."),
        idea("Notice what affects my energy.", "awareness vitality curiosity", "Record sleep, activity, and energy once a day for three days.", "Notice one time of day when energy is usually steadier.", "Plan one demanding task for a time that tends to fit better."),
        idea("Make hydration easier to remember.", "self-care consistency preparedness", "Fill a glass or bottle and place it beside a routine activity.", "Pair drinking water with one existing break.", "Choose one reminder that will not become intrusive."),
        idea("Reduce one source of avoidable physical strain.", "carefulness wellbeing effectiveness", "Adjust one chair, screen, bag, or work surface.", "Take a brief position-change break during one long task.", "Ask an appropriate professional for guidance if pain or safety is involved."),
        idea("Use healthcare support more effectively.", "self-advocacy clarity responsibility", "Write symptoms, questions, or medication details before an appointment.", "Bring a short prioritized question list.", "Ask for clarification of one instruction you do not understand."),
        idea("Practice responding kindly to body limits.", "acceptance compassion self-care", "Replace one harsh judgment with a factual description.", "Choose the smallest version of an activity that fits today.", "Pause before pushing through and check what support is available."),
        idea("Create more daylight or outdoor time.", "vitality presence balance", "Step outside for five minutes during daylight.", "Take one routine phone call near a window or outdoors.", "Pair a short outdoor pause with lunch or another daily cue."),
        idea("Prepare for a demanding day.", "preparedness self-care foresight", "Pack one needed meal, medication, or comfort item the night before.", "Review tomorrow's schedule and protect one recovery period.", "Decide what can be postponed if energy is lower than expected."),
        idea("Make relaxation a repeatable practice.", "calmness mindfulness consistency", "Try three slow breaths before one routine transition.", "Listen to a five-minute relaxation recording.", "Use the same quiet place for a brief daily pause."),
        idea("Support recovery after stress or exertion.", "resilience care balance", "Choose one low-effort recovery activity for tonight.", "Reduce one optional demand for the next hour.", "Ask for practical support with one task if needed."),
        idea("Align health choices with personal values.", "autonomy wisdom responsibility", "Write one reason a health practice matters beyond appearance or performance.", "Choose one action you are willing to repeat, not a total overhaul.", "Review the action after a week with curiosity rather than grading."),
    ],
    "personal-growth": [
        idea("Approach one avoided but important situation.", "courage growth persistence", "Write down the smallest safe approach step.", "Spend ten minutes beginning before deciding whether to continue.", "Ask one supportive person to check in afterward."),
        idea("Understand one recurring reaction better.", "self-awareness curiosity insight", "Describe what happened before, during, and after one recent example.", "Name the thought, feeling, urge, and action separately.", "Look for one pattern without deciding it explains everything."),
        idea("Practice making a self-directed choice.", "autonomy independence authenticity", "List what you want before asking others for opinions.", "Choose one low-stakes preference and state it clearly.", "Take one reversible step based on your own considered judgment."),
        idea("Build consistency with a small practice.", "discipline commitment consistency", "Choose a version that takes five minutes or less.", "Attach it to an existing daily cue.", "Track completion for seven days without requiring a perfect streak."),
        idea("Learn from a mistake without getting stuck in it.", "accountability compassion wisdom", "Write what happened, the impact, and one repair.", "Separate what you can change from what you cannot undo.", "Try one corrected action in the next similar situation."),
        idea("Clarify a personal principle.", "integrity ethics reflectiveness", "Write one situation where the principle matters.", "Name what the principle asks of you when it is inconvenient.", "Choose one small action that would express it this week."),
        idea("Strengthen assertive communication.", "assertiveness respect courage", "Write a request using one clear sentence.", "Practice saying it aloud at a steady pace.", "Use it first in a manageable, low-risk situation."),
        idea("Make room for uncertainty.", "acceptance openness flexibility", "Name one thing you do and do not know.", "Delay one unnecessary reassurance check for ten minutes.", "Choose a workable next step that does not require certainty."),
        idea("Expand my perspective on a difficult issue.", "open-mindedness understanding humility", "Write the strongest reasonable version of another view.", "Ask one curious question before offering your position.", "Read one credible source that challenges your first assumption."),
        idea("Develop a skill I care about.", "mastery learning patience", "Choose one subskill to practice for twenty minutes.", "Get feedback on one observable part of the practice.", "Schedule the next practice before ending this one."),
        idea("Recognize my strengths more accurately.", "self-awareness confidence appreciation", "Write one strength and a recent example of using it.", "Ask a trusted person what capability they rely on in you.", "Use one existing strength on a current challenge."),
        idea("Practice patience during slow progress.", "patience persistence acceptance", "Measure one small process action instead of the final result.", "Set a realistic review date instead of checking constantly.", "Notice one sign of learning that is not yet mastery."),
        idea("Respond more intentionally under pressure.", "self-control mindfulness maturity", "Pause for one breath before answering a difficult message.", "Draft the response and reread it ten minutes later.", "Name the outcome you want before choosing what to say."),
        idea("Explore an aspect of identity.", "authenticity individuality curiosity", "Journal for ten minutes about what feels genuinely yours.", "Try one reversible form of self-expression.", "Talk with a trusted person who can listen without defining you."),
        idea("Turn reflection into one useful change.", "reflectiveness effectiveness growth", "Choose one lesson from the past week.", "Translate it into a single if-then plan.", "Review whether the change helped after the next opportunity."),
    ],
    "leisure": [
        idea("Return to a creative activity I miss.", "creativity enjoyment authenticity", "Set out the materials for a fifteen-minute session.", "Make a deliberately rough first version.", "Choose one small piece to finish rather than a large project."),
        idea("Try a new form of recreation.", "exploration fun curiosity", "List three accessible activities and choose the easiest to sample.", "Book or attend one beginner-friendly session.", "Ask a friend for one low-cost recommendation."),
        idea("Make more room for play.", "playfulness joy spontaneity", "Spend ten minutes on an activity with no productivity goal.", "Invite someone to a simple game.", "Choose an intentionally silly or experimental version of a routine task."),
        idea("Plan a manageable adventure.", "adventure courage exploration", "Choose a nearby place you have not visited.", "Plan a two-hour outing with a clear return time.", "Invite someone or prepare one safety detail if going alone."),
        idea("Enjoy familiar interests more attentively.", "presence enjoyment appreciation", "Choose one favourite activity and put away another screen.", "Notice three details you usually overlook.", "Tell someone what you appreciated afterward."),
        idea("Finish a small creative piece.", "creativity commitment accomplishment", "Define a version that can be completed in one sitting.", "Set a forty-five-minute limit and stop when it is usable.", "Share or store the finished piece somewhere intentional."),
        idea("Explore music more actively.", "curiosity beauty enjoyment", "Listen to one full album or performance without multitasking.", "Make a short playlist around one mood or theme.", "Learn a few measures, chords, or rhythms on an instrument."),
        idea("Spend leisure time outdoors.", "vitality wonder recreation", "Visit one nearby park or trail for twenty minutes.", "Take a snack or book outside.", "Notice one seasonal change and record it in a photo or note."),
        idea("Make reading easier to begin.", "learning imagination solitude", "Put one appealing book beside your usual resting place.", "Read five pages before deciding whether to continue.", "Use the library to sample without committing to finish."),
        idea("Create something with other people.", "collaboration creativity connection", "Invite one person to a casual making session.", "Join one low-pressure class, rehearsal, or workshop.", "Contribute one small part to a shared creative project."),
        idea("Protect leisure from turning into another standard.", "balance acceptance enjoyment", "Choose an activity you can do imperfectly.", "Stop at the planned time even if it is unfinished.", "Notice enjoyment or interest instead of rating performance."),
        idea("Explore local culture or nature.", "discovery appreciation wonder", "Choose one museum, market, landmark, or natural area nearby.", "Check its hours and pick a specific visit window.", "Invite someone to explore one section with you."),
        idea("Use imagination in everyday life.", "imagination creativity playfulness", "Write a one-page scene, sketch, or idea.", "Change one familiar recipe, route, or arrangement experimentally.", "Collect five images or objects that suggest a theme."),
        idea("Make space for restorative solitude.", "solitude peace self-awareness", "Reserve twenty quiet minutes without obligations.", "Choose a place where interruption is less likely.", "Bring one calming activity and leave work elsewhere."),
        idea("Share an enjoyable experience.", "joy generosity connection", "Recommend one book, song, or activity with a personal note.", "Invite someone to a simple event you already plan to attend.", "Send a photo or description of something that delighted you."),
    ],
    "community": [
        idea("Contribute to a local need.", "contribution service community", "Choose one organization and read its current volunteer needs.", "Offer one bounded shift or task that fits your capacity.", "Donate one requested item rather than guessing what is useful."),
        idea("Know my neighbourhood better.", "connection curiosity belonging", "Walk one nearby route and notice public places and services.", "Introduce yourself to one neighbour you often see.", "Attend one local meeting, market, or event as an observer."),
        idea("Reduce one everyday environmental impact.", "sustainability stewardship responsibility", "Use one reusable item for a week.", "Repair, borrow, or buy used for one upcoming need.", "Check the correct local disposal route for one confusing item."),
        idea("Support a cause responsibly.", "advocacy justice courage", "Read the cause's current request from a credible organization.", "Send one respectful message to an appropriate decision-maker.", "Share one verified resource without pressuring others."),
        idea("Make a group more welcoming.", "inclusiveness warmth community", "Greet and orient one newcomer.", "Explain one unwritten norm that would help someone participate.", "Ask whether access needs have been considered for an event."),
        idea("Offer skills in service of others.", "service competence generosity", "List one practical skill you can offer for an hour.", "Ask a community group whether that help is currently needed.", "Complete one small pro-bono or mutual-aid task with clear boundaries."),
        idea("Participate more thoughtfully in civic life.", "responsibility fairness awareness", "Check one official source about a local decision.", "Write down the question you most want answered.", "Attend or watch part of one public meeting."),
        idea("Build cooperation around a shared problem.", "collaboration cooperation effectiveness", "Invite two affected people to define the problem together.", "List what each person can realistically contribute.", "Agree on one experiment and a date to review it."),
        idea("Practice everyday stewardship.", "stewardship care sustainability", "Pick up litter for ten minutes in a safe public area.", "Care for one shared space or resource you regularly use.", "Learn one local guideline that helps protect the environment."),
        idea("Support local makers or services.", "community appreciation contribution", "Choose one needed purchase from a local provider.", "Leave a specific, honest review for good work.", "Recommend a useful local service directly to one person."),
        idea("Listen across difference.", "understanding respect diversity", "Attend one moderated conversation with a listening goal.", "Ask a sincere question without debating the answer.", "Summarize a viewpoint accurately before stating your own."),
        idea("Share resources without overextending.", "generosity moderation reciprocity", "Offer one item you no longer use through a local sharing group.", "Set a clear time or amount boundary before volunteering.", "Ask what is needed before donating."),
        idea("Help preserve a community tradition.", "tradition connection stewardship", "Ask an elder or organizer how the tradition is maintained.", "Attend one event and learn its context.", "Record or help with one task only with appropriate permission."),
        idea("Respond to a community concern constructively.", "proactivity courage responsibility", "Verify the concern through a reliable local source.", "Report one concrete issue through the correct channel.", "Propose one feasible improvement rather than only naming the problem."),
        idea("Recognize community contributions.", "gratitude encouragement appreciation", "Thank one volunteer, worker, or organizer specifically.", "Send a brief note describing the impact of their work.", "Nominate or acknowledge someone through an appropriate community channel."),
    ],
    "spirituality": [
        idea("Create a brief reflective practice.", "meaning mindfulness reflectiveness", "Sit quietly for five minutes at a consistent time.", "Write one question that feels meaningful today.", "End the day by noting one moment that mattered."),
        idea("Reconnect with a spiritual tradition.", "faith tradition reverence", "Read or listen to one short passage from the tradition.", "Attend one service, gathering, or practice without committing further.", "Ask a trusted person how they engage with the tradition now."),
        idea("Explore sources of meaning.", "meaning curiosity purpose", "List three experiences that have felt worthwhile.", "Write what each experience allowed you to give or receive.", "Choose one small activity that expresses a recurring theme."),
        idea("Practice gratitude deliberately.", "gratitude appreciation mindfulness", "Write down one specific thing you appreciated today.", "Thank one person for a concrete action.", "Pause before one meal or transition to notice what supports you."),
        idea("Make room for awe or wonder.", "wonder beauty presence", "Spend ten minutes looking closely at nature, art, or the night sky.", "Listen to one piece of music without multitasking.", "Photograph or describe one ordinary detail that surprised you."),
        idea("Live one belief more consistently.", "integrity faith commitment", "Name one belief and the behaviour it invites.", "Choose a small action that fits the belief this week.", "Review where the action felt easy or difficult without self-punishment."),
        idea("Cultivate compassion in reflection.", "compassion kindness grace", "Offer one kind phrase to yourself during a difficult moment.", "Include someone who is struggling in a prayer or reflection.", "Follow reflection with one bounded caring action."),
        idea("Find steadiness during uncertainty.", "acceptance peace faith", "Repeat one grounding phrase that does not deny the difficulty.", "Take three slow breaths before the next decision.", "Speak with a trusted spiritual or reflective companion."),
        idea("Clarify what I want my life to stand for.", "purpose values wisdom", "Write a short answer to 'What do I want to practice, even when it is hard?'.", "Choose three qualities you want people to experience from you.", "Identify one ordinary choice where one quality can guide you."),
        idea("Practice forgiveness carefully.", "forgiveness compassion wisdom", "Write what you may be ready to release and what boundary remains needed.", "Distinguish forgiveness from excusing harm or restoring access.", "Take one private step toward release without contacting anyone."),
        idea("Connect with a reflective community.", "community belonging meaning", "Find one group whose practices and boundaries are clearly described.", "Attend once with permission to observe.", "Ask one member what participation is like."),
        idea("Create a meaningful ritual.", "tradition meaning presence", "Choose a simple beginning or ending ritual for the week.", "Use one object, phrase, light, or action that carries meaning for you.", "Keep the ritual brief enough to repeat."),
        idea("Study a spiritual or philosophical question.", "learning wisdom curiosity", "Choose one reputable introductory source.", "Read for twenty minutes and note one question.", "Discuss the question with someone who can tolerate uncertainty."),
        idea("Express reverence through care.", "reverence stewardship service", "Care for one place, object, or practice you consider significant.", "Learn the respectful protocol before participating in an unfamiliar tradition.", "Offer practical service without seeking recognition."),
        idea("Balance solitude and spiritual connection.", "solitude connection balance", "Choose one private practice and one communal practice this month.", "Notice which form of engagement restores or drains you.", "Adjust the length rather than abandoning the practice entirely."),
    ],
    "home-resources": [
        idea("Make my home easier to maintain.", "order simplicity self-care", "Spend ten minutes clearing one visible surface.", "Put a donation or recycling bag where clutter gathers.", "Choose a permanent home for one frequently misplaced item."),
        idea("Create a calmer entry or exit routine.", "preparedness order calmness", "Place keys, wallet, or transit items in one consistent spot.", "Pack one needed item the night before.", "Use a short checklist by the door for a week."),
        idea("Understand my current spending.", "awareness responsibility clarity", "Review one week of transactions without making judgments.", "Group purchases into a few plain-language categories.", "Circle one expense you want to understand better."),
        idea("Build a small financial buffer.", "security preparedness moderation", "Choose a modest automatic transfer you can review later.", "Move one unused subscription amount into savings.", "Name the first specific expense the buffer is meant to cover."),
        idea("Handle one delayed administrative task.", "responsibility effectiveness courage", "Open the letter, form, or account and identify the next action.", "Work on it for fifteen minutes with a timer.", "Call or message the relevant service with one prepared question."),
        idea("Reduce friction in a daily home task.", "effectiveness organization simplicity", "Notice where the task usually stalls.", "Move the needed supplies closer to where the task happens.", "Test one simpler sequence for three days."),
        idea("Care for something I already own.", "stewardship care sustainability", "Clean or maintain one frequently used item.", "Find the repair instructions for one broken object.", "Schedule or complete one small repair before replacing it."),
        idea("Make one space support rest or focus.", "balance focus wellbeing", "Remove three distracting items from the space.", "Adjust lighting, seating, or noise for the intended use.", "Keep only the materials needed for the next activity."),
        idea("Share household expectations more clearly.", "communication fairness cooperation", "List one recurring issue in neutral terms.", "Ask household members for a short planning conversation.", "Agree on one specific responsibility and review date."),
        idea("Prepare for a foreseeable disruption.", "foresight safety preparedness", "Check one smoke alarm, emergency contact, or essential supply.", "Write down where one important document is stored.", "Choose one realistic backup for a common disruption."),
        idea("Simplify one crowded category of belongings.", "simplicity order decisiveness", "Choose one drawer, shelf, or category small enough for twenty minutes.", "Keep, relocate, or release each item once.", "Stop when the bounded area is complete."),
        idea("Use resources in line with my priorities.", "values responsibility balance", "Name one priority you want spending to support.", "Compare one planned purchase with that priority before buying.", "Redirect a small amount from a low-value expense."),
        idea("Improve privacy or security at home.", "safety responsibility boundaries", "Update one weak or reused account password.", "Check who has access to one shared account or key.", "Review one device or home privacy setting."),
        idea("Make meals or household supplies easier to manage.", "organization preparedness self-care", "List five reliable staples before shopping.", "Prepare one component that makes tomorrow easier.", "Set a reminder before a frequently used supply runs out."),
        idea("Create a more welcoming home within my means.", "welcoming warmth creativity", "Clear one place for a guest to sit or set something down.", "Add one comfortable or meaningful detail you already own.", "Invite someone for a simple visit that does not require perfect preparation."),
    ],
}

UNIVERSAL_HOWS = [
    "Set a ten-minute timer and take the smallest visible step toward this.",
    "Write the next action as one sentence starting with a concrete verb, then do only that step.",
    "Choose a specific day and place for one brief first attempt.",
    "Put one needed material, link, or contact detail where it will be ready.",
    "Remove one small source of friction before trying the action.",
    "Ask one supportive person for a brief check-in after you try it.",
    "Try a low-stakes version once and treat it as information, not a test.",
    "Set one reminder connected to a routine you already have.",
    "Break the idea into three steps and complete only the first one.",
    "Draft the message, checklist, or opening sentence you would need.",
    "Pair a five-minute version with an existing daily or weekly cue.",
    "Decide in advance what 'enough for today' will mean.",
    "Make a two-minute start now so the next step is easier to resume.",
    "Choose one workable option and set the other options aside until review.",
    "After one attempt, write down what helped and what you would adjust.",
    "Reserve a fifteen-minute block and protect it from unrelated tasks.",
    "If another person is involved, communicate one clear, respectful next step without pressuring them.",
]


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def main() -> int:
    domains: dict[str, list[dict[str, object]]] = {}
    for domain_id, ideas in IDEAS.items():
        records = []
        for index, (what, tags, hows) in enumerate(ideas, 1):
            what_id = f"{domain_id}-what-{index:02d}-{slug(what)[:28]}"
            expanded_hows = [*hows, *UNIVERSAL_HOWS]
            records.append({
                "id": what_id,
                "what": what,
                "value_tags": tags,
                "hows": [{"id": f"{what_id}-how-{number:02d}", "text": text} for number, text in enumerate(expanded_hows, 1)],
            })
        domains[domain_id] = records
    payload = {"version": 1, "domains": domains}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {sum(map(len, domains.values()))} WHAT ideas and {sum(len(item['hows']) for items in domains.values() for item in items)} HOW ideas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
