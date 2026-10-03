# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS and JavaScript with no build step, hosted on GitHub Pages (repo `cicm-dermatology`) as a proof of concept; cicmdermatology.com may point at it later once the school approves. Three.js loaded from a CDN for the 3D emblem. Editable content (announcements, downloads, faculty achievements) is read from a published Google Sheet. Chosen by Claude and accepted by Gid.

## Users

- Doctors deciding where to take a graduate degree in dermatology: Thai and foreign medical graduates with at least an internship year, comparing the M.Sc. Clinical, M.Sc. Cosmetic and Ph.D. tracks against other schools, usually on a phone first and a laptop when they apply.
- Applicants already decided, who come back for the application form, deadlines, fees and the list of documents.
- Partner institutions, visiting faculty and the school's own staff, who judge the program by its research output and faculty.

## Product Purpose

The official-feeling home of the Dermatology (International Program) at Chulabhorn International College of Medicine (CICM), Thammasat University. It replaces a sub-page of cicm.tu.ac.th that worked as an announcement board. Success: an applicant understands the three programs, believes in the training and research, and finds how to apply and which documents to download without leaving the site.

## Positioning

The program describes itself as Thailand's first international graduate program in dermatology and aesthetic dermatology. Its faculty and graduates publish in international journals (112 PubMed papers 2011 to 2026 across 53 journals, 22 randomized controlled trials), students take electives abroad, and training is hands-on with real patients and modern equipment.

## Operating Context

- Admissions run once a year; the 2026 cycle's announcements, candidate lists and forms are PDFs on cicm.tu.ac.th. The 2027 dates are not out yet.
- Applications go through https://eptumed.com/applyCICM/index.php.
- Contact: Graduate Office, CICM, Thammasat University (Rangsit Campus), 99 Moo 18 Paholyothin Road, Klong Luang, Pathumthani 12121. derm.admission@gmail.com, 02-5644440 ext. 4232, Line @565wfxef, Facebook "CICM_Dermatology" (active), Instagram dermatologycicm (outdated).

## Capabilities and Constraints

- English by default with a Thai version; Thai text is checked by a Thai speaker before the school sees it.
- Staff must be able to post announcements, calls for applicants, download links and faculty achievements without touching code (Google Sheet for the proof of concept).
- Faculty profiles show full education and expertise and must accept achievements later, including for the newest lecturer who has none yet.
- Facebook page embedded for live updates, with a plain link fallback where browsers block it.
- The site carries a noindex tag until the school approves it.
- Patients whose faces can be identified are not shown.

## Brand Commitments

- CICM emblem (tower, red and yellow arcs, orange arrow, green ring text) and the "CICM DERMATOLOGY" wordmark, traced to SVG from the school's files; the Thammasat University emblem stays flat and unaltered.
- Brand colours from the emblem: orange #F67B1E, red #EC1C24, yellow #FBE40B, grey #B1AFB1, green #1B7A3A.
- Voice: Gid's plain writing style (my-writing-style skill). No marketing filler.

## Evidence on Hand

- Program film (3:42, burnt-in EN/TH subtitles) and its transcript.
- 45 labelled photos in the CICM folder: training on fruit, lab sessions, workshops with patients, lectures, graduations, white coat ceremony, CICM 2024 and 2026 conferences, electives and visits at Erasmus MC, Hamamatsu, Hokkaido, Niigata, CJIMC, Shonan Beauty Clinic Tokyo, Mirabel Clinic Korea, Greater Miami Skin and Laser Center, and MOU signings with Shonan Beauty Clinic, Mirabel Clinic, Wells Dermatology Clinic and Medical Spa, and CutisBio.
- Faculty: six lecturers and two academic officers with education and expertise from the current page.
- PubMed publication list in site/data/publications.json.
- Fees, entry requirements, English score minimums, and nine PDFs from the current page.
- The MOU list is partial; Gid will supply the full list. No student testimonials yet. Do not invent partners, rankings, testimonials or numbers.

## Product Principles

1. Research is the headline: show the papers, journals and people behind them.
2. Every claim is something the school has published or shown.
3. An applicant can reach the apply link and the documents from anywhere in two taps.
4. Staff can keep it current without a developer.

## Accessibility & Inclusion

WCAG 2.1 AA. Thai and English. Reduced-motion users get the content without the 3D and scroll motion.
