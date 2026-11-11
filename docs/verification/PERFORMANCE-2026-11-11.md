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

## Hosted candidate10:10-10:15IST

Hosted candidate verified10:10IST Nov11. PR89 https://github.com/rajeshceg3/BambooForest/pull/89 draft. Exact611830dcf3363d1488f6313d825816fd020b201c https://a329be3f.bambooforest-preview.pages.dev/ serves index-c93eb738.js1601338bytes SHA256115cdb31ef85c7e0236fbbc0b0ba694830a0310d8c1ba2b83bfa1c6b312e3db2 matchedlocal. Cloudflare success/fullhead observed.

Actualsamebuild390normalmotion hosted A/B: ?nospatial=1 oldpath0.7408/0.7856fps p50frames1333/1267ms. Defaultspatial1.1961/1.2851fps p50frames817/783ms. Samecamera18,2,-10,full4994/8800/35126. Verticesperframe old4920615/new1838463, drawcalls72/new147, instancecount50408/new9009. Difference in localearlier73calls/50411instances reflects animalpose/visible movingextras, notcontentdeletion. Real270degree touchscreen hostedyaw-1.5739745,pitchroll0,555batches,fullcounts,zeroerrors. Hosted390reducedactualUI deerstop5993/10587/42248,559batches,clearance.137,groundedwholedeersideviewactualpixelsinspected. Local1365streamactualUI finalpixels inspected,4794/8448/33717. Independenthosted1365failedbeforefinalcapture, notpassed. Reportedparent10:15withpixels/modelchart/oldyawcounterexample. No merge.

Post-PR83merge: API tree ofbc20ff17a92358354d4dc75ebd7ec3c1b23e3de2 exactlyequals4804af4verifieddeertree. Live diagnosticURL https://39355025.bambooforest-preview.pages.dev/ observedfromCloudflare. Actual390postmergeNexttimedout, sojourneyrecheckopen. Parentnotified. PR82open/unmerged.

Nextcostisolation: passiveWebGLdrawhistogramshowslargestremainingperframe terms include riverstones288000vertices/300instances twice,ground393216,shorestones192000/800instances. Spatialbatching doesnot addressallscenecost. Do not removetheseasaproductfix; considerpreservinggeometryinbounds-awarebatchesorpassownershipaftercontrolledisolation. Sourcegroundcoveralsoinstallsworkersineffectwithdefaultdrawcount, apossiblefirstdrawidentitypileanalog, notyetmeasured. No confirmedfixclaimforthesehypotheses.

## Production promotion10:29IST

User's10:22IST directreply "go to prod" approved the exact611830d preview. After fullsuitegreen and stagingCloudflaregreen, PR90mergeddevelopccc897e, PR91mergedmainff6ad57187d1580b4070a6afad89fb6988c0fb5a. APIverifiedmain treeexactly611830d. Cloudflareproductionbranch changedfromfoliagediagnostic tomain; noothersettings changed. DashboardProductionrowmainff6ad57, deployment https://b5c73bda.bambooforest-preview.pages.dev/ and stable https://bambooforest-preview.pages.dev/ . RealcloudChromium390x844normalmotion, Enter, full4994/8800/35126 counts555batches, realdragyawchangespitchroll0, lantern anddeertourstep initialized5993stalks. Actualentry/deerpixelsinspected, parentreported10:29. Index-c93eb738.js URLobserved. Thisdoesnotcloseperformance/fulljourney/physicaldeviceholds.

## Stone batches diagnostic10:33IST

Furtherwhole-worlddraws: river300instances x960vertices submittedtwice (focus/main), shore800x240vertices. Candidate groups exactoriginalFloat32matrices into32unitstream-localcells. No stone deletion,move,geometry/material/shaderchange; originalparenttransform andfocus/main/shadowlayerspreserved. CPUbounds padded4localunits forshaderdisplacement. River113chunks,shore127. Testextractsactualseeded300rivertransforms andactual800shoretransforms fromsource, verifiesbyteformultiset identity,geometry/materialsharing/layers/shadows/finitebounds. ?nostonespatial=1 reproducesoldpathin samebuild.

Samebuildlocal390normalEnterfull4994/8800/35126, softwareSwiftShaderobserved: old1.4706/1.5535fps,p50frames666.6/649.9ms; new1.7505/1.8720fps,p50566.7/533.3ms. Submittedvertices/frame1838463→1101183 (~40percentless), drawcalls147→154tradeoff. Localentrybefore/afteractualpixelsinspected; actualUI390reducedstreamstopfull4794/8448/33717 actualpixelsinspected. Uncontrolledwind/animalpose meansnotpixelidentitytest. Stillveryslow, notperformancecompletion. Hostedcheckpending. No productionchangeforstonecandidate.
