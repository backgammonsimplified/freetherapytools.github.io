# Values Dictionary Semantic Review

This audit treats values as ongoing compass directions, not destinations. It reviews all 256 authored canonical entries; it does not mechanically convert labels into verbs.

## Implemented high-confidence cleanup

- Starting canonical count: 256
- Resulting canonical count: 242
- Removed standard: Perfection
- Review-needed entries retained: 42

### Merges

- Adaptability <- Flexibility
- Collaboration <- Teamwork
- Courage <- Bravery, Valor
- Generosity <- Giving
- Gratitude <- Thankfulness
- Honesty <- Candor
- Reliability <- Dependability

### Moved to the existing life-domain model

- Health -> Health, Self-Care & Vitality
- Family -> Close Relationships, Family & Caregiving
- Friendship -> Friendship & Social Connection
- Community -> Community, Service & Environment
- Spirituality -> Spirituality, Meaning & Inner Life

## Important distinctions intentionally preserved

- **Boldness / Fortitude:** Boldness emphasizes willingness to be conspicuous or direct; Fortitude emphasizes steadiness through hardship.
- **Consistency / Reliability:** Consistency is regularity of practice; Reliability is being countable on for commitments.
- **Integrity / Ethics / Honesty:** Integrity concerns congruence, Ethics considered conduct, and Honesty truthfulness.
- **Openness / Open-Mindedness:** Openness includes receptivity to experience and feedback; Open-Mindedness is specifically considering evidence and viewpoints.
- **Compassion / Empathy / Kindness:** Understanding another's experience, responding to suffering, and everyday benevolent conduct are related but usable distinctions.
- **Responsibility / Accountability:** Responsibility concerns duties; Accountability adds ownership of impact, repair, and answerability.
- **Fairness / Equality / Justice:** Impartial decisions, equal worth/opportunity, and changing unjust systems are not interchangeable.
- **Autonomy / Independence / Freedom / Individuality:** Self-direction, self-reliance, available choice, and distinct identity guide different decisions.
- **Mindfulness / Presence / Awareness / Self-Awareness / Reflectiveness:** These differ in stance, attentional target, and whether the practice is immediate or retrospective.
- **Joy / Enjoyment / Fun / Playfulness:** Emotional quality, appreciating experience, activity, and playful stance remain meaningfully different.
- **Curiosity / Learning / Knowledge / Wisdom / Mastery:** Inquiry, process, accumulated understanding, judgment, and refined skill are separate directions.
- **Achievement / Excellence / Competence / Effectiveness:** Results, quality, capability, and choosing what works should not be collapsed.
- **Calmness / Peace / Harmony / Balance / Moderation:** Inner tone, nonviolence, relationship among parts, allocation, and avoiding extremes are distinct.
- **Connection / Intimacy:** Broad social connection does not necessarily imply close vulnerability or intimacy.

## Complete row-level review

The machine-readable audit is [`data/values-dictionary-review.csv`](data/values-dictionary-review.csv). Every original ID, label, rank, classification, cluster, proposed canonical label, decision, alias, and reason is recorded there.
