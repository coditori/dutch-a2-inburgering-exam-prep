# KNM coverage check: study pack vs. site

Compared: the 8 lesson .docx files in `~/Downloads/Inburgering.com/` (Dutch text, read in full) against `knm/themes/*.json` (woorden, weetjes, situaties) and `knm/toets/A.json` + `B.json`.

- "Missing" = in the docx, but nowhere in the site themes or the two mock tests (checked across all themes, not only the matching one).
- "(date-sensitive: verify)" = contains an amount, age, name, date or rule that may have changed. The docx is partly outdated (see "Outdated in the docx" at the end).
- The docx files are lesson transcripts. Each lesson appears two or three times (raw transcript, cleaned sentences, Persian). Facts were taken from the Dutch.

| Docx | Words (`pandoc -t plain \| wc -w`) | Site file | Missing items |
|---|---|---|---|
| 1. Wonen | 13,900 | 2-wonen.json | 15 |
| 2. Werk en inkomen | 15,011 | 3-werk.json | 15 |
| 3. Interactie, waarden en normen | 10,991 | 6-omgangsvormen.json | 15 |
| 4. Onderwijs en opvoeding | 9,731 | 4-onderwijs.json | 15 |
| 5. Gezondheid | 12,153 | 1-gezondheid.json | 15 |
| 6. Instanties | 12,409 | 5-instanties.json | 15 |
| 7. Politiek | 8,044 | 7-staatsinrichting.json | 15 |
| 8. Geschiedenis en geografie | 8,914 | 8-geschiedenis.json | 15 |

Every theme had more than 15 gaps; the lists below are the 15 most exam-relevant per theme.

---

## 1. Wonen (site: 2-wonen)

**Covered:** social housing and woningcorporatie, waiting list, urgentieverklaring, vrije sector, huurcontract and opzegtermijn, big repairs by the landlord, huurtoeslag, hypotheek, makelaar, notaris, inboedel- and aansprakelijkheidsverzekering, own energy contract, meterstand, jaarrekening, storingsnummer, waste sorting, statiegeld, noise from neighbours, buurtbemiddeling.

**Missing:**
1. Kleine reparaties (een lamp, een kraan) betaalt de huurder zelf.
2. Zet u het afval op de verkeerde dag buiten? Dan kunt u een boete krijgen van de gemeente.
3. Klein chemisch afval (verf, batterijen) brengt u apart weg.
4. Iedereen betaalt belasting aan de gemeente voor het ophalen van afval; met een laag inkomen kunt u kwijtschelding vragen.
5. Betaalt u de energierekening niet? Eerst krijgt u een waarschuwing, daarna kan het energiebedrijf de energie afsluiten.
6. Het bedrag dat u elke maand voor energie betaalt, heet het termijnbedrag.
7. Ruikt u gas? Draai de hoofdkraan dicht en bel het energiebedrijf of het storingsnummer.
8. Een woonhuisverzekering is voor een koophuis: schade aan het huis door brand, storm of water.
9. Wie een hypotheek heeft, mag de rente aftrekken bij de belastingaangifte en betaalt zo minder belasting. (date-sensitive: verify)
10. De Huurcommissie helpt bij een te hoge huur of slecht onderhoud; het huurteam of de gemeente geeft advies.
11. Inschrijven bij een woningcorporatie kost geld (ongeveer 30 euro per jaar) en u moet elk jaar verlengen. (date-sensitive: verify)
12. Bij een verhuizing noteert u de meterstanden van gas, elektriciteit en water en geeft u ze door.
13. Er zijn vaste en variabele energiecontracten; u mag overstappen naar een ander energiebedrijf.
14. NPO 1, 2 en 3 zijn de publieke zenders (de overheid betaalt); RTL en SBS zijn commerciële zenders.
15. Voor een mobiele telefoon kiest u beltegoed (prepaid) of een abonnement.

Also in the docx, lower priority: saving energy (A-label, heating off), duurzame energie (wind, zon), a newcomer usually gets a first home through the gemeente, the bank wants a vast inkomen for a mortgage.

**Different:**
- Energy problem. Docx: "Als er een probleem is in jouw huis met de energie ... neem dan zelf direct contact op met het energiebedrijf." Site: "Wat doet u als er in uw straat geen energie is? U belt het storingsnummer: 0800 - 9009." Not a real conflict (problem in your own home vs. outage in the street; the docx also names the "Nationaal Storingsnummer" for no gas), but the site only teaches one of the two.

---

## 2. Werk en inkomen (site: 3-werk)

**Covered:** UWV and WW, sollicitatieplicht, bijstand at the gemeente, AOW at 67, bruto/netto, loonstrook, jaaropgaaf, proeftijd, vast and tijdelijk contract, deeltijd, uitzendbureau, vakbond, cao, minimumloon, ondernemingsraad, bedrijfsarts, ziek melden, KvK, zzp arranges own insurance and pension, IDW, vrijwilligerswerk, zwart werken, equal pay, cv and brief.

**Missing:**
1. Wordt u werkloos? Schrijf u dan binnen één week in bij het UWV (werk.nl). (date-sensitive: verify)
2. U krijgt alleen WW als u eerst lang genoeg hebt gewerkt (de docx zegt: meer dan een half jaar). (date-sensitive: verify)
3. Met een uitkering moet u veranderingen melden (werk, inkomen, samenwonen, verhuizen): WW bij het UWV, bijstand bij de gemeente.
4. Meldt u een verandering niet? Dan krijgt u een boete of een lagere uitkering, of de uitkering stopt.
5. Met een uitkering moet u werk accepteren dat u krijgt aangeboden, ook als het niet uw droombaan is.
6. Wie lang ziek is en niet meer kan werken, kan een WIA/WGA-uitkering krijgen (arbeidsongeschikt).
7. In de Arbowet staan regels voor veilig en gezond werken (bijvoorbeeld een helm in de bouw).
8. Van uw loon gaan belasting en premies af; premies zijn voor verzekeringen zoals de WW, de AOW en het pensioen.
9. Mensen met een hoog loon betalen meer belasting dan mensen met een laag loon.
10. In het arbeidscontract staan ook het vakantiegeld, het aantal uren en de vakantiedagen; een volle werkweek is 36 tot 40 uur.
11. De vakbond onderhandelt met werkgevers over de cao; elke sector heeft een eigen cao.
12. Een re-integratiebedrijf helpt mensen die lang geen werk hebben om weer werk te vinden.
13. Met een EVC-certificaat laat u zien welke werkervaring u al hebt.
14. Wilt u met een uitkering een eigen bedrijf beginnen? Vraag dan eerst toestemming aan het UWV of meld het bij de gemeente.
15. Een zzp'er krijgt geen uitkering bij ziekte; daarvoor sluit hij zelf een arbeidsongeschiktheidsverzekering (AOV) af.

Also in the docx, lower priority: MAP is a compulsory part of inburgering (date-sensitive: verify), kindgebonden budget, functioneringsgesprek/beoordelingsgesprek, personeelsvereniging, bijscholing/nascholing, ROC beroepsopleiding, vacancies on werk.nl, KvK-nummer, the bank wants an ondernemingsplan for a loan, tips for the sollicitatiegesprek.

**Different:**
- Ondernemingsraad. Docx: "In een bedrijf met meer dan 50 werknemers is de ondernemingsraad verplicht." Site (toets B): "Een bedrijf met 50 of meer werknemers heeft een ondernemingsraad." Small difference in the boundary; the site version matches the law.
- The docx says smaller companies usually have a "medezeggenschapsraad (MR)". The site does not mention this. The usual term for small companies is personeelsvertegenwoordiging; MR is mainly used in schools. Verify before adding.

---

## 3. Interactie, waarden en normen (site: 6-omgangsvormen)

**Covered:** gefeliciteerd/gecondoleerd, trakteren, kraamvisite and beschuit met muisjes, being on time, cancelling appointments, making an appointment before a visit, small present when visiting, directness, same-sex marriage since 2001, free choice of partner, freedom of opinion and religion, home violence forbidden, Koningsdag 27 April, Sinterklaas 5 December, clubs (vereniging), stiltecoupé, buurtbemiddeling.

**Missing:**
1. Een ambtenaar mag geen cadeau aannemen.
2. In de winkel en bij de gemeente wacht u op uw beurt; u dringt niet voor (soms trekt u een nummertje).
3. Samenwonen zonder trouwen is normaal; afspraken legt u vast in een samenlevingscontract bij de notaris.
4. Een geregistreerd partnerschap geeft bijna dezelfde rechten en plichten als een huwelijk.
5. Eerwraak, besnijdenis van meisjes en verkrachting zijn verboden en strafbaar.
6. Slachtoffers van geweld kunnen hulp krijgen bij Slachtofferhulp Nederland.
7. Het is verboden om een wapen te dragen.
8. Iedereen mag zelf zijn kleding kiezen; hand in hand lopen of zoenen op straat mag, ook voor homo's.
9. De meeste vrouwen blijven werken na de geboorte van een kind; mannen en vrouwen doen samen het huishouden.
10. Kerst is een christelijk feest met vrije dagen; ook Paasmaandag, Hemelvaart en Pinksteren zijn vrije dagen. (date-sensitive: verify - the docx says Kerst is 24 and 25 December; the official days are 25 and 26 December)
11. Sinterklaas is geen vrije dag; kinderen zetten hun schoen en geloven dat hij met de boot uit Spanje komt.
12. Op Koningsdag is er een vrijmarkt: u mag zonder vergunning oude spullen op straat verkopen.
13. Met Oud en Nieuw (31 december) eten mensen oliebollen en is er vuurwerk. (date-sensitive: verify - rules for fireworks are changing)
14. Carnaval wordt vooral gevierd in Limburg en Noord-Brabant; het Suikerfeest is het feest na de ramadan; Keti Koti (1 juli) herdenkt het einde van de slavernij.
15. U trouwt officieel bij de gemeente; daarna kan het ook nog in de kerk of de moskee.

Also in the docx, lower priority: send a card for beterschap or sterkte, no phone calls in the waiting room, give your seat to an older person in the bus, tell the neighbours beforehand if you give a party, members help their club as volunteers, buurthuis, pink muisjes for a girl and blue for a boy, a schoolbag on the flagpole when a child passes the final exam, dark clothes at a funeral, Bevrijdingsdag is a day off only once every five years (date-sensitive: verify), "u" for older people and "jij" among young people.

**Different:** nothing contradictory found.

---

## 4. Onderwijs en opvoeding (site: 4-onderwijs)

**Covered:** leerplicht from 5, until 16 or 18 without diploma, leerplichtambtenaar, kinderdagverblijf, peuterspeelzaal, BSO, basisschool groups 1-8, vmbo/havo/vwo and their length, mbo/hbo/universiteit routes, openbaar and bijzonder schools, free school choice, ouderbijdrage is voluntary, tien-minutengesprek, kinderbijslag (SVB), kinderopvangtoeslag (Belastingdienst), studiefinanciering (DUO).

**Missing:**
1. In groep 8 maken kinderen een toets en krijgen ze een schooladvies voor het voortgezet onderwijs. (date-sensitive: verify - the docx says "CITO-toets"; the current name is doorstroomtoets)
2. Kinderen zijn alleen vrij in de schoolvakanties; voor een vrije dag (bijvoorbeeld een begrafenis) vraagt u toestemming aan de school, anders kunt u een boete krijgen.
3. Vrijheid van onderwijs betekent ook: iedereen mag een eigen school beginnen (christelijk, islamitisch, Dalton, Jenaplan).
4. Speciaal onderwijs is voor kinderen met een handicap of een leerprobleem.
5. Kinderopvangtoeslag krijgt u alleen als de ouders werken of een opleiding volgen.
6. Een gastouder vangt kinderen van 0 tot 12 jaar op, in haar eigen huis of bij het kind thuis.
7. De voorschool (VVE) is voor kinderen van 2,5 tot 4 jaar die extra hulp nodig hebben met taal; de gemeente beslist wie mag meedoen.
8. Seksuele voorlichting is een verplicht onderdeel van het onderwijs.
9. In het voortgezet onderwijs zijn de schoolboeken gratis; schriften en een rekenmachine betalen de ouders zelf.
10. Stichting Leergeld en de gemeente helpen ouders met weinig geld met schoolkosten, sport en muziekles.
11. Studiefinanciering bestaat uit een lening, soms een aanvullende beurs (als de ouders weinig verdienen) en een ov-kaart voor studenten. (date-sensitive: verify - the basisbeurs is back since 2023 and is not in the docx)
12. U meldt uw kind op tijd aan bij een basisschool, vóór de vierde verjaardag.
13. De hoogte van de kinderbijslag hangt af van de leeftijd van het kind.
14. Ouders kunnen meepraten op school in de ouderraad of de medezeggenschapsraad en gaan naar de ouderavond.
15. Bij grote problemen met de opvoeding kunt u hulp vragen bij de huisarts of de jeugdzorg. (date-sensitive: verify - the docx says "bureau jeugdzorg"; jeugdhulp now goes through the gemeente / Centrum voor Jeugd en Gezin)

Also in the docx, lower priority: groep 3 is where children learn to read, write and count; parents are responsible for their child's behaviour on social media; changes in income or childcare hours must be reported or you pay toeslag back; examples of jobs after mbo (shop, childcare), hbo (teacher), university (doctor, lawyer).

**Different:**
- Parental responsibility. Docx: "Ouders zijn juridisch verantwoordelijk voor kinderen tot 16 jaar." Site (woorden): "Ouders zijn verantwoordelijk voor hun kinderen tot 18 jaar." and toets B: "Tot hoeveel jaar zijn ouders verantwoordelijk voor hun kind? Tot 18 jaar." The docx sentence is about liability for damage (which ends earlier), the site about parental authority (until 18). Check which wording the exam uses and make the site explicit.
- Free school. Docx: "In Nederland is onderwijs gratis tot 18 jaar." Site: "Is de basisschool gratis? Ja." Not a conflict, but the site only mentions the basisschool.

---

## 5. Gezondheid (site: 1-gezondheid)

**Covered:** huisarts first, 112, huisartsenpost, spoedeisende hulp, verwijsbrief and specialist, apotheek vs drogist, recept, eigen bijdrage, basisverzekering compulsory, eigen risico (not for the huisarts), aanvullende verzekering, children under 18 free (also dentist), consultatiebureau 0-4 and vaccinations, verloskundige, tolk, beroepsgeheim, thuiszorg, mental problems first to the huisarts, dentist check twice a year, zorgtoeslag (in the instanties theme).

**Missing:**
1. Voor volwassenen zit de tandarts niet in de basisverzekering; daarvoor is een aparte tandartsverzekering (niet verplicht).
2. Kunt u niet naar een afspraak bij de huisarts of tandarts? Zeg dan 24 uur van tevoren af, anders moet u toch betalen.
3. Voor een korte vraag belt u de huisarts tijdens het telefonisch spreekuur; bij heel zieke of oude mensen komt de huisarts op huisbezoek.
4. Nederlandse huisartsen geven niet snel medicijnen; vaak gaat een klacht vanzelf over.
5. U kiest zelf een huisarts en een tandarts, het liefst dicht bij uw huis.
6. Naar de polikliniek neemt u mee: de verwijsbrief, uw verzekeringsbewijs en een identiteitsbewijs.
7. Bij de spoedeisende hulp (eerste hulp) hebt u geen afspraak nodig; wie de hulp het meest nodig heeft, wordt het eerst geholpen.
8. Voor een soa-test of vragen over seks kunt u direct naar de GGD, zonder de huisarts.
9. De huisarts verwijst mensen met psychische problemen naar een psycholoog of de GGZ; zonder verwijzing betaalt de verzekering niet.
10. Na de geboorte komt de kraamhulp ongeveer een week helpen; die regelt u zelf vóór de bevalling.
11. Zijn er problemen in de zwangerschap? Dan gaat u naar de gynaecoloog en bevalt u in het ziekenhuis.
12. Mantelzorg is zorg door familie of vrienden; ouderen blijven zo lang mogelijk thuis wonen en gaan pas later naar een verzorgingshuis of verpleeghuis.
13. Hulp thuis (huishouden, traplift, scootmobiel) vraagt u aan bij de gemeente via de Wmo; u krijgt eerst een keukentafelgesprek.
14. Het eigen risico is 385 euro per jaar; met een hoger eigen risico betaalt u minder premie. (date-sensitive: verify)
15. U mag elk jaar een andere zorgverzekering kiezen: opzeggen vóór 1 januari, een nieuwe kiezen vóór 1 februari. (date-sensitive: verify)

Also in the docx, lower priority: declareren (send the bill to the insurer to get money back), premium is paid from age 18, Wlz for people who need care 24 hours a day with CIZ (indication) and CAK (own contribution), praktijkondersteuner (POH), groeiboekje, opname in hospital, patiëntenpas, paracetamol without recept also at the supermarket, healthy lifestyle, schuldhulpverlening and help with loneliness from the gemeente, DigiD for health portals.

**Different:** nothing contradictory found. Note: the docx says "Verzorgingshuis en verpleeghuis is exact hetzelfde", which is not accurate; do not copy that to the site.

---

## 6. Instanties (site: 5-instanties)

**Covered:** passport/ID/driving licence at the gemeente, uittreksel, reporting a move, a birth and a marriage, BSN, DigiD, identificatieplicht from 14, aangifte, 112 vs 0900-8844, bezwaar, betalen in termijnen, Juridisch Loket, the three toeslagen and reporting income changes, compulsory car insurance, reisverzekering, bankrekening, machtiging, vergunning, naturalisatie, IND, discrimination forbidden.

**Missing:**
1. Iedereen die in Nederland woont, moet zich inschrijven bij de gemeente (in de BRP); daar krijgt u ook uw BSN. (date-sensitive: verify - the docx still says GBA)
2. Ook een scheiding en een overlijden in het gezin meldt u bij de gemeente.
3. Een paspoort, identiteitskaart en rijbewijs zijn 10 jaar geldig. (date-sensitive: verify - shorter for children)
4. Met een paspoort reist u naar alle landen, met een identiteitskaart alleen binnen Europa; met een rijbewijs kunt u niet reizen, maar het is wel een geldig identiteitsbewijs.
5. Kunt u geen identiteitsbewijs laten zien aan de politie? Dan kunt u een boete krijgen.
6. Wilt u een misdaad anoniem melden? Bel dan 0800 - 7000 (Meld Misdaad Anoniem).
7. Een verblijfsvergunning is voor bepaalde tijd (tijdelijk) of voor onbepaalde tijd (permanent); een permanente kan pas na vijf jaar wonen in Nederland. (date-sensitive: verify)
8. Voor naturalisatie moet u zijn ingeburgerd en moet u vaak uw andere nationaliteit opgeven. (date-sensitive: verify)
9. Belastingaangifte doet u elk jaar tussen 1 maart en 1 mei, met DigiD. (date-sensitive: verify)
10. Op de meeste dingen die u koopt, zit 21% btw. (date-sensitive: verify)
11. De gemeente heeft eigen belastingen (afval, onroerendezaakbelasting, hondenbelasting); met een laag inkomen kunt u kwijtschelding vragen. (date-sensitive: verify)
12. Sociaal raadslieden helpen gratis met brieven, formulieren en bezwaar; een advocaat is niet gratis, maar met een laag inkomen betaalt u minder.
13. Discriminatie meldt u bij een antidiscriminatiebureau of bij de politie. (date-sensitive: verify - the meldpunt is now called Discriminatie.nl)
14. Is uw bankpas gestolen of kwijt? Laat de pas meteen blokkeren bij de bank en doe aangifte.
15. Hebt u schulden? Vraag hulp bij de schuldhulpverlening van de gemeente; de voedselbank geeft gratis eten aan mensen met heel weinig geld.

Also in the docx, lower priority: kindgebonden budget, changes must be reported within 4 weeks (date-sensitive: verify), keep the jaaropgaaf for five years, wijkagent, you must cooperate with the police, never share DigiD and keep your BSN private, Informatiepunt Digitale Overheid in the library, Nibud, maatschappelijk werk, contactloos betalen and Tikkie, inventing damage for an insurance claim is a crime, sex between an adult and someone under 16 is a crime, a permit to cut down a tree.

**Different:**
- Verblijfsvergunning. Docx: "verblijfvergunningen kun je aanvragen bij de gemeente." Site (toets B): "De IND beslist over verblijfsvergunningen." and the theme uses "Een verblijfsvergunning bij de gemeente" as a wrong answer option. The site is right (IND); the docx is imprecise.
- ID age in public transport. Docx: "In het openbaar vervoer moet je al een identiteitsbewijs laten zien vanaf 12 jaar." Site: "Mila is 16 jaar. De politie vraagt in de trein om haar identiteitsbewijs ... Ja, dat moet vanaf 14 jaar." The general rule is 14; the docx adds a separate rule of 12 for public transport that the site does not have. (date-sensitive: verify)

---

## 7. Politiek (site: 7-staatsinrichting)

**Covered:** grondwet and article 1, democratie, rechtsstaat, king as head of state with little power, regering, minister-president, parlement, 150 and 75 seats, elections every four years, voting from 18 and not compulsory, who makes laws, only the judge punishes, right to a lawyer, freedom of opinion and press, demonstrating, gemeenteraad, burgemeester, provinces (12), waterschap, voting rights of non-Dutch residents, EU (free movement, euro), The Hague as seat of government.

**Missing:**
1. Er zijn drie machten: de wetgevende macht (het parlement), de uitvoerende macht (de regering) en de rechterlijke macht (de rechters); zij werken los van elkaar.
2. Kerk en staat zijn gescheiden: bij een conflict tussen de wet en een geloof gaat de wet voor.
3. Actief kiesrecht is dat u mag stemmen; passief kiesrecht is dat mensen op u mogen stemmen.
4. De partijen die samen de regering vormen, heten de coalitie; de andere partijen zijn de oppositie.
5. Het kabinet bestaat uit de ministers en de staatssecretarissen.
6. Op Prinsjesdag (de derde dinsdag van september) leest de koning de troonrede voor: de plannen van de regering voor het nieuwe jaar.
7. De koning ondertekent de wetten, maar maakt ze niet; Nederland is een constitutionele monarchie.
8. De Tweede Kamer wordt direct gekozen; de Eerste Kamer wordt gekozen door de leden van de Provinciale Staten.
9. De minister-president wordt niet direct door de burgers gekozen; hij komt uit de coalitie.
10. Er zijn ook verkiezingen voor de Provinciale Staten (elke vier jaar) en voor het Europees Parlement (elke vijf jaar).
11. De baas van een provincie is de commissaris van de Koning; de provincie beslist over wegen, natuur en milieu. (date-sensitive: verify - the docx still says "commissaris van de koningin")
12. Linkse partijen willen dat de overheid veel voor arme mensen doet; rechtse partijen willen dat mensen meer zelf regelen. Progressief wil verandering, conservatief wil dingen houden zoals ze zijn.
13. Iedereen heeft zelfbeschikkingsrecht: u beslist zelf over uw lichaam en uw leven (trouwen, kinderen, anticonceptie, abortus, studie en werk).
14. Een kindhuwelijk is verboden; meisjes moeten ook naar school.
15. U stemt in een stembureau met een rood potlood op een stembiljet; de belangrijkste persoon van een partij is de lijsttrekker.

Also in the docx, lower priority: referendum (only ja or nee), tasks of rijk vs provincie vs gemeente, rights (privacy, rechtsbijstand, education, care) and duties (obey the law, pay tax, report changes), koningin Máxima, the Europese Commissie governs the EU, the euro since 2002, "16 parties in the Tweede Kamer" and the list of the seven biggest parties (date-sensitive: verify - both are out of date), "10 to 15 ministers" (date-sensitive: verify).

**Different:**
- Municipal vote for non-Dutch residents. Docx: "Om te stemmen voor de gemeenteraad moet je minimaal 18 jaar zijn en minimaal 5 jaar legaal in Nederland wonen." Site: "Mensen uit de EU mogen dat. Andere mensen mogen het na vijf jaar wonen in Nederland." The site is more precise; the docx leaves out the EU exception.

---

## 8. Geschiedenis en geografie (site: 8-geschiedenis)

**Covered:** Amsterdam capital / The Hague government, 12 provinces, neighbours, Tachtigjarige Oorlog 1568-1648, Willem van Oranje, Wilhelmus, Gouden Eeuw and trade, VOC, colonies (Indonesia, Suriname), slavery ended 1863, WWII 1940-1945, Wilhelmina in England, 4 and 5 May, flood of 1953 and Deltawerken, dikes, polders, Flevoland, IJsselmeer and Afsluitdijk, Rotterdam harbour, Randstad, provinces on the sea, Maastricht in Limburg, Kingdom of four countries, Koningsdag.

**Missing:**
1. In de Tweede Wereldoorlog zijn de meeste Nederlandse Joden door de Duitsers weggevoerd en vermoord (de Holocaust). Mensen in het verzet hielpen Joden om onder te duiken.
2. Nederland is in 1945 bevrijd door soldaten uit Engeland, de Verenigde Staten en Canada.
3. Indonesië werd onafhankelijk in 1949 en Suriname in 1975; daarna kwamen veel mensen uit die landen naar Nederland.
4. Vanaf de jaren zestig kwamen gastarbeiders uit Turkije en Marokko naar Nederland om te werken; veel van hen zijn gebleven.
5. Rembrandt is een beroemde schilder uit de Gouden Eeuw; zijn bekendste schilderij is De Nachtwacht.
6. Nederlanders handelden ook in slaven uit Afrika; zij moesten werken op plantages in Suriname en op de Antillen.
7. Willem van Oranje is in 1584 vermoord; hij is een voorvader van koning Willem-Alexander.
8. De oorlog met Spanje ging ook over geloof: de Spaanse koning Filips II was katholiek, veel Nederlanders waren protestant.
9. Nederland is lid van de NAVO (samenwerking van legers, sinds 1949) en van de Verenigde Naties.
10. De Europese samenwerking begon in 1957; sinds 2002 betalen veel landen met de euro.
11. In de jaren zestig en zeventig kregen mensen meer vrijheid en werd de kerk minder belangrijk; abortus en euthanasie zijn onder strenge regels toegestaan.
12. Bonaire, Saba en Sint Eustatius zijn bijzondere gemeenten van Nederland (geen eigen landen).
13. In Friesland spreken mensen ook Fries; dat is de tweede officiële taal.
14. In het noorden liggen de Waddeneilanden; de Veluwe is een groot natuurgebied in Gelderland; Schiphol is het grootste vliegveld.
15. In het openbaar vervoer checkt u in en uit met een OV-chipkaart, een bankpas of een telefoon; een reis plant u met 9292 of de NS-app. (date-sensitive: verify)

Also in the docx, lower priority: Romans around year 0 (Utrecht and Maastricht), Middle Ages, the Republic of 1588, the industrial revolution with workers and the first socialist parties, "first grondwet in 1814" (date-sensitive: verify - the exam more often asks about the grondwet of 1848), 1,836 dead in 1953 and West-Brabant and Zuid-Holland also flooded, "27% of the country is below sea level" and "17 million inhabitants" (date-sensitive: verify), zeeklimaat, about half of the Dutch have a religion and most of those are Christian, refugees from Syria, Iraq, Afghanistan and Eritrea, Haarlem is the capital of Noord-Holland, UNESCO Werelderfgoed, off-peak discount and children's tickets in public transport (date-sensitive: verify).

**Different:** nothing contradictory found.

---

## Outdated in the docx (do not copy to the site as is)

- "GBA" (gemeentelijke basisadministratie): now BRP. One later lesson in the same docx already says BRP.
- "CITO-toets" in groep 8: now the doorstroomtoets.
- "Bureau Jeugdzorg": youth care now goes through the gemeente.
- "Commissaris van de koningin": now commissaris van de Koning.
- "Deelgemeenten" in big cities: abolished; now stadsdelen / gebiedscommissies.
- Party list and "16 parties": from an older parliament.
- Company names Nuon and Tele2: no longer exist under those names.
- Acceptgiro: abolished in 2023.
- Kerst "24 en 25 december": the public holidays are 25 and 26 December.
- Eigen risico 385 euro, btw 21%, AOW age 67, tax return 1 March - 1 May: correct when written, check each year.

## Method notes

- All eight docx were converted with `pandoc -t plain` and the Dutch text was read completely. Lines that were only Persian were filtered out first; a check on the removed lines showed that no Dutch content was lost (only a few repeated brand names and URLs). For files 2-8, lines that were exact repeats of an earlier line were removed before reading.
- The automatic transcript in the docx has many speech-recognition errors ("uurtoeslag", "kraanvisite", "HLW-uitkering"). Items above were only taken where the meaning was clear from the cleaned sentences or from context.
- This file lists gaps only. No existing site file was changed.
