#!/usr/bin/env python3
"""Build the verified section-scan inventory and attach published page images."""

from __future__ import annotations

import argparse
import csv
import re
import shutil
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
INVENTORY = ROOT / "data" / "source-inventory.csv"
BOOK_MATCHES = ROOT / "data" / "book-matches.csv"
PHP_MATCHES = ROOT / "data" / "php-matches.csv"


@dataclass(frozen=True)
class Document:
    slug: str
    filename: str
    section: str
    pages: int


DOCUMENTS = {
    "general": Document(
        "general",
        "0 general handouts and skills to turn to app.pdf",
        "General Skills",
        6,
    ),
    "goal-setting": Document(
        "goal-setting",
        "1 goal setting and tracking.pdf",
        "Goal Setting & Tracking",
        34,
    ),
    "distress-tolerance": Document(
        "distress-tolerance",
        "2 Distress Tolerance.pdf",
        "Distress Tolerance",
        48,
    ),
    "interpersonal-effectiveness": Document(
        "interpersonal-effectiveness",
        "4 Distress Tolerance.pdf",
        "Interpersonal Effectiveness",
        49,
    ),
    "wellness": Document(
        "wellness", "5 Wellness.pdf", "Wellness", 62
    ),
    "emotion-regulation": Document(
        "emotion-regulation",
        "6 Emotional Regulation.pdf",
        "Emotion Regulation",
        78,
    ),
    "cbt-skills": Document(
        "cbt-skills", "7 CBT SKills.pdf", "CBT Skills", 54
    ),
}


# These source pages contain landscape material scanned into portrait pages.
# Rotate only the published derivative; the verified source PDFs remain untouched.
ROTATE_CLOCKWISE = {
    "general-p004",
    "goal-setting-p002",
    "goal-setting-p008",
    "goal-setting-p033",
    "goal-setting-p034",
    "wellness-p008",
    "wellness-p048",
    "wellness-p049",
    "emotion-regulation-p008",
    "emotion-regulation-p009",
    "emotion-regulation-p012",
    "cbt-skills-p032",
    "cbt-skills-p033",
    "cbt-skills-p034",
}


LESSON_FILES = {
    "tool-finder": "tool-finder/index.qmd",
    "goal-guidelines": "learn/goal-setting/goal-setting-guidelines.qmd",
    "weekly-goal-worksheets": "learn/goal-setting/weekly-goals-home-practice.qmd",
    "weekly-home-practice": "learn/goal-setting/daily-tracking.qmd",
    "dt-stop": "learn/distress-tolerance/stop-crisis-survival.qmd",
    "dt-tipp": "learn/distress-tolerance/tipp.qmd",
    "dt-distraction": "learn/distress-tolerance/self-soothe.qmd",
    "dt-improve": "learn/distress-tolerance/improve.qmd",
    "dt-pros-cons": "learn/distress-tolerance/pros-and-cons.qmd",
    "dt-radical-acceptance": "learn/distress-tolerance/radical-acceptance.qmd",
    "ie-boundaries": "learn/interpersonal-effectiveness/boundaries.qmd",
    "ie-priorities": "learn/interpersonal-effectiveness/clarifying-priorities.qmd",
    "ie-dear-man": "learn/interpersonal-effectiveness/dear-man.qmd",
    "ie-give": "learn/interpersonal-effectiveness/give.qmd",
    "ie-fast": "learn/interpersonal-effectiveness/fast.qmd",
    "ie-ask-no": "learn/interpersonal-effectiveness/saying-no.qmd",
    "wellness-sleep": "learn/wellness/sleep.qmd",
    "wellness-activation": "learn/wellness/behavioral-activation.qmd",
    "wellness-bca": "learn/wellness/behavior-chain-missing-links.qmd",
    "wellness-addictions": "learn/wellness/maladaptive-coping.qmd",
    "wellness-eating": "learn/wellness/balanced-eating.qmd",
    "wellness-medication": "learn/wellness/medication-doctor-visits.qmd",
    "er-what": "learn/emotion-regulation/what-emotions-do.qmd",
    "er-emotions": "learn/emotion-regulation/observing-describing-emotions.qmd",
    "er-check": "learn/emotion-regulation/check-the-facts.qmd",
    "er-opposite": "learn/emotion-regulation/opposite-action.qmd",
    "er-accumulating": "learn/emotion-regulation/abc-please.qmd",
    "er-mastery": "learn/emotion-regulation/positive-emotions-mastery-cope-ahead.qmd",
    "cbt-intro": "learn/cbt-anxiety/introduction-to-cbt.qmd",
    "cbt-traps": "learn/cbt-anxiety/thinking-traps.qmd",
    "cbt-records-1": "learn/cbt-anxiety/thought-records.qmd",
    "cbt-records-2": "learn/cbt-anxiety/thought-records-part-2.qmd",
    "cbt-worry": "learn/cbt-anxiety/understanding-worry.qmd",
    "cbt-exposure": "learn/cbt-anxiety/safety-behaviours-exposure.qmd",
}


def row(page_type: str, lesson: str, title: str, kind: str = "handout", notes: str = ""):
    return page_type, lesson, title, kind, notes


def divider(title: str):
    return row("session-divider", "", title, "structural", "Blank session notes page; establishes lesson boundary.")


def duplicate(title: str, notes: str):
    return row("duplicate", "", title, "duplicate", notes)


SPECS: dict[str, list[tuple[str, str, str, str, str]]] = {}

SPECS["general"] = [
    row("section-cover", "", "General Handouts", "structural", "Cover metadata only."),
    row("reference", "goal-guidelines", "Skills & Strengths List", "reference"),
    row("reference", "tool-finder", "Skills Overview", "reference"),
    row("reference", "tool-finder", "Emotional Overload & Emotional Numbness Skills Guide", "reference", "The general scan cover lists a Feeling Wheel, but this physical page contains a skills-selection guide."),
    row("reference", "tool-finder", "Skills Use Guideline", "reference"),
    row("content-handout", "tool-finder", "Dialectics: Acceptance and Change", "handout"),
]

SPECS["goal-setting"] = [
    row("section-cover", "", "Goal Setting", "structural", "Cover metadata only."),
    row("worksheet", "goal-guidelines", "Case Map", "worksheet"),
    row("content-handout", "goal-guidelines", "Goal Setting Guidelines", "handout"),
    row("content-handout", "goal-guidelines", "SMART Goal Setting", "handout"),
    row("worksheet", "weekly-goal-worksheets", "Daily Goal Worksheet: Monday to Wednesday", "worksheet"),
    row("worksheet", "weekly-goal-worksheets", "Daily Goal Worksheet: Thursday to Sunday", "worksheet"),
    row("worksheet", "weekly-home-practice", "Weekly Home Practice Tracker", "worksheet"),
    row("worksheet", "weekly-home-practice", "Weekly Food Diary", "worksheet"),
    duplicate("Weekly Food Diary", "Rotated duplicate of goal-setting-p008."),
    row("worksheet", "weekly-home-practice", "Monthly Habit Tracker", "worksheet"),
    duplicate("Monthly Habit Tracker", "Duplicate of goal-setting-p010."),
]
for page in range(12, 33):
    cycle_title = (
        "Daily Goal Worksheet: Monday to Wednesday"
        if (page - 12) % 3 == 0
        else "Daily Goal Worksheet: Thursday to Sunday"
        if (page - 12) % 3 == 1
        else "Weekly Home Practice Tracker"
    )
    original = {0: "goal-setting-p005", 1: "goal-setting-p006", 2: "goal-setting-p007"}[(page - 12) % 3]
    SPECS["goal-setting"].append(duplicate(cycle_title, f"Repeated copy of {original}."))
SPECS["goal-setting"].extend(
    [
        row("worksheet", "weekly-home-practice", "Daily Mood Tracker", "worksheet"),
        row("worksheet", "weekly-home-practice", "Skills and Wellness Diary Card", "worksheet"),
    ]
)

SPECS["distress-tolerance"] = [
    row("section-cover", "", "Distress Tolerance", "structural", "Cover metadata only."),
    divider("Session 1: Introduction & STOP"),
    row("exercise", "dt-stop", "How Can I Make a Distress Crisis Worse?", "exercise"),
    row("content-handout", "dt-stop", "When to Use Crisis Survival Skills", "handout"),
    row("content-handout", "dt-radical-acceptance", "Turning the Mind", "handout", "Title clearly places this later page with Radical Acceptance."),
    row("content-handout", "dt-radical-acceptance", "Willingness", "handout", "Title clearly places this later page with Radical Acceptance."),
    row("content-handout", "dt-stop", "STOP Skill", "handout"),
    row("worksheet", "dt-radical-acceptance", "Turning the Mind, Willingness, and Willfulness", "worksheet", "Title clearly places this later page with Radical Acceptance."),
    row("worksheet", "dt-stop", "Using the STOP Skill", "worksheet"),
    divider("Session 2: TIPP"),
    row("reference", "dt-tipp", "Window of Tolerance", "reference"),
    row("content-handout", "dt-tipp", "Changing Your Body Chemistry with TIPP", "handout"),
    row("content-handout", "dt-tipp", "Using Cold Water, Step by Step", "handout"),
    row("content-handout", "dt-tipp", "Paired Muscle Relaxation, Step by Step", "handout"),
    row("exercise", "dt-tipp", "Progressive Muscle Relaxation: Nose to Toes", "exercise"),
    row("worksheet", "dt-tipp", "Changing Body Chemistry with TIPP Skills", "worksheet"),
    divider("Session 3: Distraction & Self-Soothing"),
    row("content-handout", "dt-distraction", "Distracting with Wise Mind ACCEPTS", "handout"),
    row("reference", "dt-distraction", "Wise Mind ACCEPTS Overview", "reference"),
    row("content-handout", "dt-distraction", "Self-Soothing", "handout"),
    row("exercise", "dt-distraction", "Self-Soothing Practice", "exercise"),
    row("worksheet", "dt-distraction", "Distracting with Wise Mind ACCEPTS", "worksheet"),
    row("exercise", "dt-distraction", "Creating a Self-Soothing Kit", "exercise"),
    divider("Session 4: IMPROVE"),
    row("content-handout", "dt-improve", "Improving the Moment", "handout"),
    row("exercise", "dt-improve", "One Thing in the Moment", "exercise"),
    row("exercise", "dt-improve", "Peaceful Place Meditation", "exercise"),
    row("worksheet", "dt-improve", "IMPROVE Practice", "worksheet"),
    divider("Session 5: Pros & Cons"),
    row("content-handout", "dt-pros-cons", "Pros and Cons", "handout"),
    row("reference", "dt-pros-cons", "Pros and Cons: How To", "reference"),
    row("worksheet", "dt-pros-cons", "Pros and Cons of Acting on Crisis Urges", "worksheet"),
    row("exercise", "dt-pros-cons", "Pros and Cons Practice", "exercise"),
    divider("Session 6: Radical Acceptance, Half-Smiling & Willing Hands"),
    row("reference", "dt-radical-acceptance", "Dandelions", "reference"),
    row("exercise", "dt-radical-acceptance", "Developing the Skill of Radical Acceptance", "exercise"),
    row("content-handout", "dt-radical-acceptance", "Radical Acceptance", "handout"),
    row("content-handout", "dt-radical-acceptance", "Radical Acceptance: Factors That Interfere", "handout"),
    row("reference", "dt-radical-acceptance", "Radical Acceptance Quick Reference", "reference"),
    row("content-handout", "dt-radical-acceptance", "Practicing Radical Acceptance Step by Step", "handout"),
    row("content-handout", "dt-radical-acceptance", "Half-Smiling and Willing Hands", "handout"),
    duplicate("Practicing Radical Acceptance Step by Step", "Marked duplicate of distress-tolerance-p040."),
    row("reference", "dt-radical-acceptance", "How to Solve a Problem", "reference"),
    row("reference", "dt-radical-acceptance", "Three Parts of Radical Acceptance", "reference"),
    duplicate("Developing the Skill of Radical Acceptance", "Completed copy of distress-tolerance-p036; not suitable as a blank public worksheet."),
    row("worksheet", "dt-radical-acceptance", "Radical Acceptance Practice", "worksheet"),
    row("content-handout", "dt-radical-acceptance", "Practicing Half-Smiling and Willing Hands, Part 1", "handout"),
    row("content-handout", "dt-radical-acceptance", "Practicing Half-Smiling and Willing Hands, Part 2", "handout"),
]

SPECS["interpersonal-effectiveness"] = [
    row("section-cover", "", "Interpersonal Effectiveness", "structural", "Cover metadata only; filename is misleading."),
    divider("Session 1: Boundaries"),
    row("content-handout", "ie-boundaries", "Understanding Boundaries", "handout"),
    row("worksheet", "ie-boundaries", "Identifying Your Boundaries", "worksheet"),
    row("reference", "ie-boundaries", "Characteristics of Healthy Relationships", "reference"),
    row("exercise", "ie-boundaries", "Identifying My Personal Boundaries", "exercise"),
    row("exercise", "ie-boundaries", "Understanding My Boundaries", "exercise"),
    divider("Session 2: Clarifying Priorities & Myths"),
    row("content-handout", "ie-priorities", "Factors in the Way of Interpersonal Effectiveness", "handout"),
    row("content-handout", "ie-priorities", "Myths in the Way of Interpersonal Effectiveness", "handout"),
    row("worksheet", "ie-priorities", "Challenging Myths: Objectives Effectiveness", "worksheet"),
    row("worksheet", "ie-priorities", "Challenging Myths: Relationship and Self-Respect", "worksheet"),
    row("content-handout", "ie-priorities", "Obtaining Objectives Skillfully", "handout"),
    row("content-handout", "ie-priorities", "Clarifying Goals in Interpersonal Situations", "handout"),
    row("worksheet", "ie-priorities", "Clarifying Priorities in Interpersonal Situations", "worksheet"),
    divider("Session 3: DEAR MAN"),
    row("content-handout", "ie-dear-man", "Guidelines for Objectives Effectiveness: DEAR MAN, Part 1", "handout"),
    row("content-handout", "ie-dear-man", "Guidelines for Objectives Effectiveness: DEAR MAN, Part 2", "handout"),
    row("content-handout", "ie-dear-man", "Applying DEAR MAN Skills to a Difficult Interaction", "handout"),
    row("worksheet", "ie-dear-man", "DEAR MAN Script", "worksheet"),
    divider("Session 4: DEAR + GIVE"),
    row("exercise", "ie-give", "Finding and Maintaining Relationships", "exercise"),
    row("content-handout", "ie-give", "Guidelines for Relationship Effectiveness: GIVE", "handout"),
    row("content-handout", "ie-give", "Levels of Validation", "handout"),
    row("reference", "ie-give", "A Few Words About Validation", "reference"),
    row("reference", "ie-give", "Validation Expressions", "reference"),
    row("reference", "ie-give", "The Four Horsemen and Their Antidotes", "reference"),
    row("worksheet", "ie-give", "DEAR + GIVE Script", "worksheet"),
    duplicate("DEAR + GIVE Script", "Duplicate copy of interpersonal-effectiveness-p028."),
    divider("Session 5: DEAR + FAST"),
    row("exercise", "ie-fast", "Self-Respect Effectiveness Reflection", "exercise"),
    row("reference", "ie-fast", "A Bill of Assertive Rights", "reference"),
    row("content-handout", "ie-fast", "Guidelines for Self-Respect Effectiveness: FAST", "handout"),
    row("reference", "ie-fast", "Apologizing Effectively", "reference"),
    row("worksheet", "ie-fast", "DEAR + FAST Script", "worksheet"),
    divider("Session 6: Ask, Say No & Troubleshooting"),
    row("content-handout", "ie-ask-no", "How Intensely to Ask or Say No, Part 1", "handout"),
    row("content-handout", "ie-ask-no", "How Intensely to Ask or Say No, Part 2", "handout"),
    row("content-handout", "ie-ask-no", "How Intensely to Ask or Say No, Part 3", "handout"),
    row("content-handout", "ie-ask-no", "Troubleshooting Interpersonal Effectiveness, Part 1", "handout"),
    row("content-handout", "ie-ask-no", "Troubleshooting Interpersonal Effectiveness, Part 2", "handout"),
    row("worksheet", "ie-ask-no", "Troubleshooting Interpersonal Effectiveness Skills, Part 1", "worksheet"),
    row("worksheet", "ie-ask-no", "Troubleshooting Interpersonal Effectiveness Skills, Part 2", "worksheet"),
    row("reference", "ie-ask-no", "Dialectics: Acceptance and Change", "reference"),
    row("content-handout", "ie-ask-no", "Walking the Middle Path", "handout"),
    row("worksheet", "ie-ask-no", "Identifying Mindfulness of Others", "worksheet"),
    row("worksheet", "ie-ask-no", "Opposite Sides That Can Both Be True", "worksheet"),
    row("worksheet", "ie-ask-no", "Important Opposites to Balance", "worksheet"),
    row("worksheet", "ie-ask-no", "Identifying Dialectics", "worksheet"),
]

SPECS["wellness"] = [
    row("section-cover", "", "Wellness", "structural", "Cover metadata only."),
    row("content-handout", "wellness-sleep", "Taking Care of Your Mind by Taking Care of Your Body", "handout", "PLEASE overview supports Wellness and is linked from Emotion Regulation."),
    divider("Session 1: Sleep"),
    row("exercise", "wellness-sleep", "Exploring Sleep", "exercise"),
    row("reference", "wellness-sleep", "Understanding Sleep", "reference"),
    row("reference", "wellness-sleep", "The Five Stages of Sleep", "reference"),
    row("content-handout", "wellness-sleep", "Additional Sleep Hygiene Tips", "handout"),
    row("worksheet", "wellness-sleep", "Sleep Hygiene Practice Sheet", "worksheet"),
    divider("Session 2: Behaviour Activation"),
    row("reference", "wellness-activation", "The First Vicious Cycle", "reference"),
    row("reference", "wellness-activation", "The Second Vicious Cycle", "reference"),
    row("worksheet", "wellness-activation", "Your Cycles", "worksheet"),
    row("content-handout", "wellness-activation", "The Upward Spiral of Behavioural Activation", "handout"),
    row("content-handout", "wellness-activation", "What Is Behaviour Activation?", "handout"),
    row("content-handout", "wellness-activation", "Behaviour Activation: Battery vs. Generator", "handout"),
    row("content-handout", "wellness-activation", "Behavioural Activation Tips, Part 1", "handout"),
    row("content-handout", "wellness-activation", "Behavioural Activation Tips, Part 2", "handout"),
    row("content-handout", "wellness-activation", "Behavioural Activation Tips, Part 3", "handout"),
    row("worksheet", "wellness-activation", "Activity Monitoring Worksheet", "worksheet"),
    row("worksheet", "wellness-activation", "Activity Planning Worksheet", "worksheet"),
    row("worksheet", "wellness-activation", "Behavioural Activation Barriers and Resources", "worksheet"),
    divider("Session 3: Behaviour Chain Analysis & Missing Links"),
    row("content-handout", "wellness-bca", "Analyzing Behaviour", "handout"),
    row("reference", "wellness-bca", "The Behaviour Chain Analysis", "reference"),
    row("reference", "wellness-bca", "Behaviour Chain Analysis Example, Part 1", "reference"),
    row("reference", "wellness-bca", "Behaviour Chain Analysis Example, Part 2", "reference"),
    row("reference", "wellness-bca", "Behaviour Chain Analysis Example, Part 3", "reference"),
    row("worksheet", "wellness-bca", "Behaviour Chain Analysis Worksheet, Part 1", "worksheet"),
    row("worksheet", "wellness-bca", "Behaviour Chain Analysis Worksheet, Part 2", "worksheet"),
    row("worksheet", "wellness-bca", "Behaviour Chain Analysis Worksheet, Part 3", "worksheet"),
    row("worksheet", "wellness-bca", "Behaviour Chain Analysis Map", "worksheet"),
    row("worksheet", "wellness-bca", "Missing-Links Analysis", "worksheet"),
    divider("Session 4: Addictions"),
    row("reference", "wellness-addictions", "Effects of Substance Use", "reference"),
    row("reference", "wellness-addictions", "Signs of Maladaptive Coping", "reference"),
    row("content-handout", "wellness-addictions", "Stages of Change", "handout"),
    row("worksheet", "wellness-addictions", "Stages of Change Worksheet, Part 1", "worksheet"),
    row("worksheet", "wellness-addictions", "Stages of Change Worksheet, Part 2", "worksheet"),
    row("worksheet", "wellness-addictions", "Stages of Change Worksheet, Part 3", "worksheet"),
    row("reference", "wellness-addictions", "Naloxone: Save a Life", "reference"),
    row("reference", "wellness-addictions", "Opioid Overdoses: What to Do", "reference"),
    divider("Session 5: Balanced Eating"),
    row("content-handout", "wellness-eating", "Seven Tips for Balanced Eating, Part 1", "handout"),
    row("content-handout", "wellness-eating", "Seven Tips for Balanced Eating, Part 2", "handout"),
    row("reference", "wellness-eating", "Eating Well on a Budget", "reference"),
    row("reference", "wellness-eating", "Canada's Food Guide: Eat Well, Live Well", "reference"),
    row("reference", "wellness-eating", "Healthy Eating Is More Than the Foods You Eat", "reference"),
    row("reference", "wellness-eating", "Estimating Portion Sizes", "reference"),
    row("worksheet", "wellness-eating", "Weekly Food Journal", "worksheet"),
    row("worksheet", "wellness-eating", "Weekly Meal Plan", "worksheet"),
    divider("Session 6: Medication & Doctor's Visits"),
    row("exercise", "wellness-medication", "Doctor Appointment Barriers", "exercise"),
    row("content-handout", "wellness-medication", "Tips for Managing Appointments", "handout"),
    row("worksheet", "wellness-medication", "Questions for Your Doctor and Appointment Reminder", "worksheet"),
    row("content-handout", "wellness-medication", "Myths About Psychiatric Medication, Part 1", "handout"),
    row("content-handout", "wellness-medication", "Myths About Psychiatric Medication, Part 2", "handout"),
    row("reference", "wellness-medication", "Medication Reminder Tools", "reference"),
    row("reference", "wellness-medication", "Medication Organizers", "reference"),
    row("reference", "wellness-medication", "Alarms and Medication Dispensers", "reference"),
    row("worksheet", "wellness-medication", "My Current Medications", "worksheet"),
    row("worksheet", "wellness-medication", "My Current Medications: Extended", "worksheet"),
    row("reference", "wellness-medication", "Health Care Connect", "reference"),
]

SPECS["emotion-regulation"] = [
    row("section-cover", "", "Emotion Regulation", "structural", "Cover metadata only."),
    divider("Session 1: What Emotions Do for You"),
    row("reference", "er-what", "Basic Functions of Emotions", "reference"),
    row("content-handout", "er-what", "Goals of Emotion Regulation", "handout"),
    row("content-handout", "er-what", "What Emotions Do for You", "handout"),
    row("content-handout", "er-what", "What Makes It Hard to Regulate Your Emotions", "handout"),
    row("worksheet", "er-what", "Myths About Emotions", "worksheet"),
    row("reference", "er-what", "Emotion Diary Example", "reference"),
    row("worksheet", "er-what", "Emotion Diary", "worksheet"),
    divider("Session 2: Emotions"),
    row("exercise", "er-emotions", "Learning About Emotions", "exercise"),
    row("reference", "er-emotions", "Model for Describing Emotions", "reference"),
    duplicate("Basic Functions of Emotions", "Duplicate of emotion-regulation-p003."),
    row("content-handout", "er-emotions", "Ways to Describe Emotions: Anger", "handout"),
    row("content-handout", "er-emotions", "Ways to Describe Emotions: Disgust", "handout"),
    row("content-handout", "er-emotions", "Ways to Describe Emotions: Envy", "handout"),
    row("content-handout", "er-emotions", "Ways to Describe Emotions: Fear", "handout"),
    row("content-handout", "er-emotions", "Ways to Describe Emotions: Happiness", "handout"),
    row("content-handout", "er-emotions", "Ways to Describe Emotions: Jealousy", "handout"),
    row("content-handout", "er-emotions", "Ways to Describe Emotions: Love", "handout"),
    row("content-handout", "er-emotions", "Ways to Describe Emotions: Sadness", "handout"),
    row("content-handout", "er-emotions", "Ways to Describe Emotions: Shame", "handout"),
    row("content-handout", "er-emotions", "Ways to Describe Emotions: Guilt", "handout"),
    row("worksheet", "er-emotions", "Understanding and Naming Your Emotions", "worksheet"),
    row("worksheet", "er-emotions", "Observing and Describing Emotions", "worksheet"),
    row("exercise", "er-emotions", "The Tangled Ball of Emotions", "exercise"),
    row("exercise", "er-emotions", "Where Do I Feel Emotions?", "exercise"),
    divider("Session 3: Check the Facts"),
    row("worksheet", "er-check", "Fact or Opinion?", "worksheet"),
    row("reference", "er-check", "Fact, Opinion, Belief, and Prejudice", "reference"),
    row("content-handout", "er-check", "Changing Emotional Responses", "handout"),
    row("content-handout", "er-check", "Check the Facts", "handout"),
    row("reference", "er-check", "Examples of Emotions That Fit the Facts", "reference"),
    row("exercise", "er-check", "Check the Facts Practice", "exercise"),
    divider("Session 4: Opposite Action & Problem Solving"),
    row("worksheet", "er-opposite", "Choosing Problem Solving or Opposite Action", "worksheet"),
    row("content-handout", "er-opposite", "Opposite Action and Problem Solving", "handout"),
    row("content-handout", "er-opposite", "Opposite Action", "handout"),
    row("content-handout", "er-opposite", "Problem Solving", "handout"),
    row("content-handout", "er-opposite", "Reviewing Opposite Action and Problem Solving, Part 1", "handout"),
    row("content-handout", "er-opposite", "Reviewing Opposite Action and Problem Solving, Part 2", "handout"),
    row("content-handout", "er-opposite", "Reviewing Opposite Action and Problem Solving, Part 3", "handout"),
    row("reference", "er-opposite", "Opposite Action Elevator Example", "reference"),
]
for emotion in ("Fear", "Anger", "Disgust", "Envy", "Jealousy", "Love", "Sadness", "Shame", "Guilt"):
    SPECS["emotion-regulation"].append(row("content-handout", "er-opposite", f"Opposite Action for {emotion}", "handout"))
SPECS["emotion-regulation"].extend(
    [
        row("exercise", "er-opposite", "Opposite Action to Change Emotions", "exercise"),
        row("worksheet", "er-opposite", "Problem Solving Worksheet, Part 1", "worksheet"),
        row("worksheet", "er-opposite", "Problem Solving Worksheet, Part 2", "worksheet"),
        divider("Session 5: Accumulating Positive Emotions"),
        row("content-handout", "er-accumulating", "ABC PLEASE Overview", "handout"),
        row("content-handout", "er-accumulating", "Accumulating Positive Emotions: Short Term", "handout"),
        row("reference", "er-accumulating", "Pleasant Events List, Part 1", "reference"),
        row("reference", "er-accumulating", "Pleasant Events List, Part 2", "reference"),
        row("reference", "er-accumulating", "Pleasant Events List, Part 3", "reference"),
        row("content-handout", "er-accumulating", "Accumulating Positive Emotions: Long Term", "handout"),
        row("reference", "er-accumulating", "Values and Priorities List, Part 1", "reference"),
        row("reference", "er-accumulating", "Values and Priorities List, Part 2", "reference"),
        row("reference", "er-accumulating", "Values and Priorities List, Part 3", "reference"),
        row("worksheet", "er-accumulating", "Building Positive Experiences Now", "worksheet"),
        row("worksheet", "er-accumulating", "Daily Pleasant Moments Record", "worksheet"),
        row("worksheet", "er-accumulating", "Accumulating Positive Emotions: Long Term Worksheet, Part 1", "worksheet"),
        row("worksheet", "er-accumulating", "Accumulating Positive Emotions: Long Term Worksheet, Part 2", "worksheet"),
        divider("Session 6: Building Mastery & Cope Ahead"),
        row("content-handout", "er-mastery", "Building Mastery", "handout"),
        row("content-handout", "er-mastery", "Changing Emotional Responses with Cope Ahead", "handout"),
        row("content-handout", "er-mastery", "How to Cope Ahead", "handout"),
        row("reference", "er-mastery", "Mind Mapping and Mastery", "reference"),
        row("exercise", "er-mastery", "Mastery Mind Map", "exercise"),
        row("worksheet", "er-mastery", "Cope Ahead Worksheet", "worksheet"),
        row("exercise", "er-mastery", "Cope Ahead for the Holidays, Part 1", "exercise"),
        row("exercise", "er-mastery", "Cope Ahead for the Holidays, Part 2", "exercise"),
    ]
)

SPECS["cbt-skills"] = [
    row("section-cover", "", "CBT Skills", "structural", "Cover metadata only."),
    divider("Session 1: Introduction to CBT"),
    row("reference", "cbt-intro", "Fear, Anxiety, Stress, and Panic", "reference"),
    row("worksheet", "cbt-intro", "Understanding My Anxiety", "worksheet"),
    row("worksheet", "cbt-intro", "The Cost of Anxiety", "worksheet"),
    row("reference", "cbt-intro", "Symptoms of Anxiety", "reference"),
    row("reference", "cbt-intro", "Alarming Adrenaline", "reference"),
    row("reference", "cbt-intro", "Fight or Flight", "reference"),
    row("content-handout", "cbt-intro", "Five Factor Model", "handout"),
    row("worksheet", "cbt-intro", "Five Factor Model Worksheet", "worksheet"),
    divider("Session 2: Thinking Traps"),
    row("reference", "cbt-traps", "Thinking Traps Overview", "reference"),
    row("worksheet", "cbt-traps", "Testing Your Thoughts: Side One", "worksheet"),
    row("reference", "cbt-traps", "What Are Core Beliefs?", "reference"),
    row("worksheet", "cbt-traps", "Testing Your Thoughts: Side Two", "worksheet"),
    row("exercise", "cbt-traps", "Find the Thinking Traps", "exercise"),
    row("worksheet", "cbt-traps", "Identifying Thinking Traps, Part 1", "worksheet"),
    row("worksheet", "cbt-traps", "Identifying Thinking Traps, Part 2", "worksheet"),
    divider("Session 3: Thought Records Part 1"),
    row("reference", "cbt-records-1", "The Farmer and His Horse", "reference"),
    row("content-handout", "cbt-records-1", "How to Get Out of a Thinking Trap", "handout"),
    row("reference", "cbt-records-1", "Challenge Negative Thinking", "reference"),
    row("worksheet", "cbt-records-1", "Challenging Negative Thinking Practice", "worksheet"),
    row("content-handout", "cbt-records-1", "Thought Record Part 1", "handout"),
    row("worksheet", "cbt-records-1", "Identifying Automatic Thoughts", "worksheet"),
    divider("Session 4: Thought Records Part 2"),
    row("content-handout", "cbt-records-2", "Thought Record Part 2: Challenging the Hot Thought", "handout"),
    row("content-handout", "cbt-records-2", "Looking for Evidence", "handout"),
    row("content-handout", "cbt-records-2", "Creating Balanced Alternatives", "handout"),
    row("content-handout", "cbt-records-2", "Best Friend Technique and Re-Rating", "handout"),
    row("reference", "cbt-records-2", "Thoughts About Thought Records", "reference"),
    row("reference", "cbt-records-2", "Completed Thought Record Example 1", "reference"),
    row("reference", "cbt-records-2", "Completed Thought Record Example 2", "reference"),
    row("worksheet", "cbt-records-2", "Blank Thought Record", "worksheet"),
    divider("Session 5: Understanding Worry"),
    row("content-handout", "cbt-worry", "Understanding Worry, Part 1", "handout"),
    row("content-handout", "cbt-worry", "Understanding Worry, Part 2", "handout"),
    row("reference", "cbt-worry", "Worry Beliefs", "reference"),
    row("reference", "cbt-worry", "Worry and Problem Solving", "reference"),
    row("content-handout", "cbt-worry", "Postpone Your Worry", "handout"),
    row("content-handout", "cbt-worry", "Using the Worry Tree", "handout"),
    row("reference", "cbt-worry", "The Worry Tree", "reference"),
    duplicate("The Worry Tree", "Duplicate copy of cbt-skills-p042."),
    row("worksheet", "cbt-worry", "Worry Diary", "worksheet"),
    row("worksheet", "cbt-worry", "Fear Ladder Starter", "worksheet"),
    divider("Session 6: Safety Behaviours & Exposure"),
    row("worksheet", "cbt-exposure", "Avoidance Worksheet", "worksheet"),
    row("content-handout", "cbt-exposure", "What Are Safety Behaviours?", "handout"),
    row("worksheet", "cbt-exposure", "Safety Behaviour Checklist", "worksheet"),
    row("content-handout", "cbt-exposure", "Situational Exposure", "handout"),
    row("reference", "cbt-exposure", "Examples of Fear Ladders", "reference"),
    row("reference", "cbt-exposure", "Ideas for Challenging Different Fears", "reference"),
    row("worksheet", "cbt-exposure", "Developing Exposure Hierarchies", "worksheet"),
    row("worksheet", "cbt-exposure", "Exposure Hierarchy Worksheet", "worksheet"),
]


def build_records() -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for slug, document in DOCUMENTS.items():
        specs = SPECS[slug]
        if len(specs) != document.pages:
            raise ValueError(f"{slug}: expected {document.pages} page specs, got {len(specs)}")
        for page, (page_type, lesson, title, kind, notes) in enumerate(specs, 1):
            publish = page_type not in {"section-cover", "session-divider", "blank-notes", "duplicate"}
            records.append(
                {
                    "id": f"{slug}-p{page:03d}",
                    "source_document": document.filename,
                    "source_page": page,
                    "page_type": page_type,
                    "section": document.section,
                    "lesson": lesson,
                    "resource_title": title,
                    "resource_kind": kind,
                    "publish": "true" if publish else "false",
                    "notes": notes,
                }
            )
    return records


def write_inventory(records: list[dict[str, object]]) -> None:
    INVENTORY.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "id", "source_document", "source_page", "page_type", "section",
        "lesson", "resource_title", "resource_kind", "publish", "notes",
    ]
    with INVENTORY.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(records)


def copy_assets(records: list[dict[str, object]], rendered_root: Path) -> None:
    for slug in DOCUMENTS:
        target_dir = SITE / "resources" / slug
        target_dir.mkdir(parents=True, exist_ok=True)
        for stale in target_dir.glob("*.jpg"):
            stale.unlink()
    for record in records:
        if record["publish"] != "true":
            continue
        identifier = str(record["id"])
        slug = identifier.rsplit("-p", 1)[0]
        page = int(record["source_page"])
        source = rendered_root / slug / f"{slug}-p{page - 1:03d}.jpg"
        target = SITE / "resources" / slug / f"{identifier}.jpg"
        if not source.is_file():
            raise FileNotFoundError(source)
        if identifier in ROTATE_CLOCKWISE:
            with Image.open(source) as image:
                image.rotate(-90, expand=True).save(target, quality=95)
        else:
            shutil.copy2(source, target)


def strip_old_resource_blocks() -> None:
    pattern = re.compile(r"\n## Handouts and Worksheets \{#handouts-and-worksheets\}.*\Z", re.DOTALL)
    for qmd in SITE.rglob("*.qmd"):
        source = qmd.read_text(encoding="utf-8")
        if pattern.search(source):
            qmd.write_text(pattern.sub("\n", source).rstrip() + "\n", encoding="utf-8", newline="\n")


def load_book_matches() -> dict[str, dict[str, str]]:
    if not BOOK_MATCHES.is_file():
        return {}
    with BOOK_MATCHES.open(encoding="utf-8-sig") as handle:
        return {row["source_id"]: row for row in csv.DictReader(handle)}


def load_php_matches() -> dict[str, dict[str, str]]:
    if not PHP_MATCHES.is_file():
        return {}
    with PHP_MATCHES.open(encoding="utf-8-sig") as handle:
        return {row["source_id"]: row for row in csv.DictReader(handle)}


def alternative_resource_markdown(
    *, title: str, label: str, pdf: str, preview: str, match_id: str,
    source_id: str, match_source: str,
) -> str:
    return (
        f"::: {{.bs-resource-match data-match-id=\"{match_id}\" "
        f"data-source-id=\"{source_id}\" data-match-source=\"{match_source}\" "
        f"data-candidate-asset=\"{pdf}\"}}\n"
        f"**{label}**\n\n"
        f"[![{label}: {title}]({preview})"
        f"{{.img-fluid fig-alt=\"{label}: {title}\"}}]({pdf})\n\n"
        f"[Open {label}]({pdf})\n\n"
        "<button type=\"button\" class=\"btn btn-sm btn-outline-danger "
        "bs-match-review-control\" hidden>Incorrect match</button>\n"
        "<span class=\"bs-match-review-status\" aria-live=\"polite\"></span>\n"
        ":::"
    )


def resource_markdown(
    record: dict[str, object], qmd: Path, book_matches: dict[str, dict[str, str]],
    php_matches: dict[str, dict[str, str]], native_content: str = "",
) -> str:
    identifier = str(record["id"])
    slug = identifier.rsplit("-p", 1)[0]
    asset = SITE / "resources" / slug / f"{identifier}.jpg"
    relative = Path("/") / asset.relative_to(SITE)
    href = relative.as_posix()
    title = str(record["resource_title"])
    match = book_matches.get(identifier)
    php_match = php_matches.get(identifier)
    accepted_alternative = bool(
        (match and match.get("confidence") == "high" and match.get("review_state") == "accepted")
        or (php_match and php_match.get("php_match_status") == "high"
            and php_match.get("review_state") == "accepted")
    )
    block = (
        f":::: {{.bs-practice-resource #resource-{identifier} data-source-id=\"{identifier}\"}}\n"
        f"**{title}**\n"
    )
    if not accepted_alternative:
        block += (
            f"\n[![{title}]({href}){{.img-fluid fig-alt=\"{title}\"}}]({href})\n\n"
            f"[Download / View Handout]({href})\n"
        )
    if (match and match.get("confidence") == "high" and match.get("clean_asset")
            and match.get("review_state") != "rejected"):
        clean_pdf = match["clean_asset"]
        clean_preview = clean_pdf.removesuffix(".pdf") + ".jpg"
        block += "\n" + alternative_resource_markdown(
            title=title, label="Clean Printable Copy", pdf=clean_pdf,
            preview=clean_preview, match_id=match["match_id"], source_id=identifier,
            match_source="linehan-book",
        )
    if (php_match and php_match.get("php_match_status") == "high"
            and php_match.get("review_state") != "rejected"):
        block += "\n" + alternative_resource_markdown(
            title=title, label="Higher-Resolution Copy", pdf=php_match["high_res_asset"],
            preview=php_match["high_res_preview"], match_id=php_match["match_id"],
            source_id=identifier, match_source="php-high-res",
        )
    if native_content:
        block += "\n\n" + native_content.strip()
    return block + "\n::::"


def attach_resources(records: list[dict[str, object]]) -> None:
    book_matches = load_book_matches()
    php_matches = load_php_matches()
    by_lesson: dict[str, list[dict[str, object]]] = {key: [] for key in LESSON_FILES}
    for record in records:
        if record["publish"] == "true":
            by_lesson[str(record["lesson"])].append(record)
    heading_for_kind = {
        "handout": "Handouts & Worksheets",
        "worksheet": "Practice Materials",
        "exercise": "Exercises",
        "reference": "Reference Materials",
    }
    order = ("handout", "worksheet", "exercise", "reference")
    for lesson, relative in LESSON_FILES.items():
        qmd = SITE / relative
        source = qmd.read_text(encoding="utf-8").rstrip()
        resource_match = re.search(
            r"\n<!-- section-scan-resources:start -->.*?<!-- section-scan-resources:end -->",
            source,
            flags=re.DOTALL,
        )
        native_content = {
            match.group("source_id"): match.group(0).strip()
            for match in re.finditer(
                r"<!-- native-resource-content:(?P<source_id>[^:]+):start -->.*?"
                r"<!-- native-resource-content:(?P=source_id):end -->",
                source,
                flags=re.DOTALL,
            )
            if resource_match and resource_match.start() <= match.start() < resource_match.end()
        }
        resource_slot = "\n<!-- section-scan-resources:slot -->"
        source = re.sub(
            r"\n<!-- section-scan-resources:start -->.*?<!-- section-scan-resources:end -->",
            resource_slot,
            source,
            count=1,
            flags=re.DOTALL,
        ).rstrip()
        blocks = ["<!-- section-scan-resources:start -->"]
        for kind in order:
            matching = [record for record in by_lesson[lesson] if record["resource_kind"] == kind]
            if not matching:
                continue
            heading = heading_for_kind[kind]
            anchor = heading.lower().replace(" & ", "-").replace(" ", "-")
            blocks.append(f"## {heading} {{#{anchor}}}")
            blocks.extend(
                resource_markdown(
                    record, qmd, book_matches, php_matches,
                    native_content.get(str(record["id"]), ""),
                )
                for record in matching
            )
        blocks.append("<!-- section-scan-resources:end -->")
        resource_block = "\n\n".join(blocks)
        if resource_slot in source:
            output = source.replace(resource_slot, "\n" + resource_block, 1)
        else:
            output = source + "\n\n" + resource_block
        qmd.write_text(output.rstrip() + "\n", encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rendered-root", type=Path)
    parser.add_argument("--attach", action="store_true", help="Copy rendered pages and update lesson resource blocks.")
    parser.add_argument("--refresh-resource-blocks", action="store_true", help="Update lesson resource blocks without recopying section-scan assets.")
    args = parser.parse_args()
    records = build_records()
    write_inventory(records)
    if args.attach:
        if args.rendered_root is None:
            parser.error("--attach requires --rendered-root")
        strip_old_resource_blocks()
        copy_assets(records, args.rendered_root.resolve())
        attach_resources(records)
    elif args.refresh_resource_blocks:
        attach_resources(records)
    published = sum(record["publish"] == "true" for record in records)
    structural = sum(record["page_type"] in {"section-cover", "session-divider"} for record in records)
    duplicates = sum(record["page_type"] == "duplicate" for record in records)
    print(f"Inventory: {len(records)} pages; {published} published; {structural} structural; {duplicates} duplicates.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
