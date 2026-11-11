--------------------------- MODULE Bamboo ---------------------------
EXTENDS Naturals, TLC
CONSTANT PreservePending
VARIABLES screen, worker, tour, audio, muted, lookPending, wrapped, preserved
vars == <<screen,worker,tour,audio,muted,lookPending,wrapped,preserved>>
Init == /\ screen = "Intro" /\ worker = "Loading" /\ tour = 0
 /\ audio = "Uncreated" /\ muted = TRUE /\ lookPending = FALSE
 /\ wrapped = FALSE /\ preserved = TRUE
Enter == /\ screen="Intro" /\ screen'="Explore" /\ audio'="Suspended"
 /\ UNCHANGED <<worker,tour,muted,lookPending,wrapped,preserved>>
WorkerReady == /\ worker="Loading" /\ worker'="Ready"
 /\ UNCHANGED <<screen,tour,audio,muted,lookPending,wrapped,preserved>>
StartTour == /\ screen="Explore" /\ screen'="Tour" /\ tour'=1
 /\ UNCHANGED <<worker,audio,muted,lookPending,wrapped,preserved>>
NextTour == /\ screen="Tour" /\ tour<5 /\ tour'=tour+1 /\ worker'="Loading"
 /\ UNCHANGED <<screen,audio,muted,lookPending,wrapped,preserved>>
ExitTour == /\ screen="Tour" /\ screen'="Explore" /\ tour'=0
 /\ UNCHANGED <<worker,audio,muted,lookPending,wrapped,preserved>>
Unmute == /\ audio="Suspended" /\ audio'="Running" /\ muted'=FALSE
 /\ UNCHANGED <<screen,worker,tour,lookPending,wrapped,preserved>>
Mute == /\ audio="Running" /\ audio'="Suspended" /\ muted'=TRUE
 /\ UNCHANGED <<screen,worker,tour,lookPending,wrapped,preserved>>
Look == /\ screen="Explore" /\ ~lookPending /\ lookPending'=TRUE
 /\ UNCHANGED <<screen,worker,tour,audio,muted,wrapped,preserved>>
Wrap == /\ lookPending /\ ~wrapped /\ wrapped'=TRUE /\ preserved'=PreservePending
 /\ UNCHANGED <<screen,worker,tour,audio,muted,lookPending>>
Idle == UNCHANGED vars
Next == Enter \/ WorkerReady \/ StartTour \/ NextTour \/ ExitTour \/ Unmute \/ Mute \/ Look \/ Wrap \/ Idle
MutedIsSilent == muted => audio # "Running"
TourOwnsLook == screen="Tour" => tour>0
NoLostInput == wrapped => preserved
=============================================================================
