# Bamboo

TLC reached 74 states and 333 steps. The chart draws 15 states and 18 arrows.
The view hides 74 steps, so the chart does not draw them.
The step you enter changes Visit and Sound at the same time.
The step you choose Next changes Visit and Forest at the same time.

## NoLostInput breaks
The shortest path has 3 steps:
0. Visit Intro, Forest Forest preparing, Sound Sound not started, Look No pending turn
1. you enter: Visit Explore, Forest Forest preparing, Sound Muted, Look No pending turn
2. you drag to look: Visit Explore, Forest Forest preparing, Sound Muted, Look Turn damping
3. turn crosses the angle boundary: Visit Explore, Forest Forest preparing, Sound Muted, Look Pending turn discarded

## Rules that hold
MutedIsSilent, TourOwnsLook, NoDeadlock
