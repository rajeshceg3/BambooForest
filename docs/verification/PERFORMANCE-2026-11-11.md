# Phone-first performance diagnosis, Nov11

User asked for statechart and create-verification workflow at09:56IST. Public pstack guidance read from cursor/plugins revision246bc508c139c5e036dfafea8978d31a7433279f. Generated projectlocal verification recipe and featuremap, executed launch/doctor/normalEnter/framewindows/screenshot/cleanup successfully. Evidence remained after cleanup. One mappedfeature proven, not every map entry.

Bounded TLA+ model actually checked with pstack statechart and TLC1.7.4:74states333steps,15chartstates18arrows. Currentversion4ruleshold. Old yaw-wrap model breaks NoLostInput in3actions: Enter, look, crossangleboundary. Earlier actualsameinput reproduction documented in YAW-WRAP note before/after. Model excludes speed,graphicscost,failures and mostappstates, so not appcertification.

## Confirmed contributor and candidate

Before: threeworldwide instanced bamboo drawgroups bound the entireforest. Three can frustumreject the wholemesh but not its individual workertransforms, so offscreeninstances are stillsubmitted. Diagnostic removingbamboo improvedsoftware390sample from~0.7to2.6fps, not a productfix. CSS-effects-off only~0.9fps, effects/MSAAoff~1fps, not wholecause.

Candidate partitions all workertransforms intospatialdrawbatches, adaptive cellsize max24,spread/14. No stalk/branch/leaf removed,moved,decimated ormaterialchanged. Originalfulltransforms retained in nondrawing namedanchors fordeertour sightline scoring. Chunks sharegeometry/material and havecomputedbounds padded3units for shaderwind/playerbend. Frustumrejects offviewchunks. Sourceanchors excluded fromfocuslayer toavoid double raycasts. Diagnostics ?nospatial=1 returnsold threebatchpath forsamebuild A/B.

Same390x844 normalmotion localbuild, SwiftShader directlyobserved, normalEnter, full4994/8800/35126:
- Oldpath two10secondwindows:0.868/0.893fps, p50frame1150/1117ms.
- Batchedpath:1.440/1.534fps, p50frame683/650ms.
- Submittedvertices perframe approximately4.921million to1.838million, down62.6percent. Submittedinstancecount perframe50411to9006. Drawcalls perframe73to146, a tradeoff.
- Zero pageerrors. Allworkertransforms byteforbyte multisetpreserved, includingduplicates; unitcheck actualworkeroutput.

This is a measured contributor and partialimprovement, NOT acceptable wholephoneperformance or user'sphysicaldevice rate. Morebottlenecks remain. Originalscenequality/fulljourney/audio/performanceholds remain.

Inspectedpixels:390normalentry before/after,390reducedmotion actualUI deerstop full5993/10587/42248 correctsideframe,1365reducedmotion actualUI streamstop full4794/8448/33717. Existingbankquality sparse/straight remains. Earlierstepsadvancedrapidly in finalframingchecks, not fulltourvisualpass. Exacthostedcandidate and newhostedpixels remain required. No merge.

Audio boundedcheck on priorhosted0fac82f:initialsuspendedzerooutput, UIunmute runningnonzerosignal, Streamstemgain rises~.008to.064, Mute suspends/freezescontextclock. Suspendedanalyserretainslastbuffer, not livedsound. This doesnot certifylisteningquality or audioallplatforms.
