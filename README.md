# CICM Dermatology website

Proof of concept for the Dermatology (International Program) at Chulabhorn International College of Medicine, Thammasat University. Static HTML hosted on GitHub Pages. The site carries a noindex tag until CICM approves it.

## Pages

- `index.html`: home page, one scroll from the skin surface down through each layer
- `research.html`: every PubMed paper by the faculty and program members, with search and filters
- `faculty.html`: full profiles, recent papers and achievements
- `admissions.html`: courses, requirements, English scores, documents, tuition and downloads

Thai is at `?lang=th` on any page, or the EN/TH switch in the top bar.

## Updating content without code

Announcements, downloads and faculty achievements can come from a Google Sheet. Until a sheet is connected, the site reads `data/content.json`.

1. Make a Google Sheet with three tabs named `announcements`, `downloads` and `achievements`.
2. Put these column names in row 1 of each tab:
   - announcements: `date`, `tag_en`, `tag_th`, `title_en`, `title_th`, `link`, `pinned`
   - downloads: `group`, `title_en`, `title_th`, `url`
   - achievements: `faculty_id`, `year`, `text_en`, `text_th`, `link`
3. Share the sheet as "Anyone with the link can view".
4. Copy the long ID from the sheet's link (`docs.google.com/spreadsheets/d/THIS_PART/edit`) into `sheetId` in `js/config.js`.

Changes in the sheet show on the site the next time the page loads.

Column notes:

- `pinned`: type `yes` to keep an announcement at the top.
- `group` for downloads: `announcements`, `forms`, `programs` or `folders`.
- `faculty_id`: `jitlada`, `premjit`, `punyaphat`, `sunatra`, `pawit` or `sittha`.
- Leave a Thai column empty and the English text shows in both languages.

## Updating the publication list

`data/publications.json` was built from PubMed on 3 October 2026. To refresh it, run the same PubMed author searches again and replace the file. Each paper keeps its PMID, DOI, authors, journal, year, topic and study design.

## Editing pages

The pages are assembled from `src/` by `build.py` (shared head, header and footer). Edit the files in `src/`, run `python3 build.py`, then push.

`js/emblem.js` and `js/map.js` are bundled from `src/js/` with esbuild, so edit the source there and rebuild.

## Assets and where they came from

- CICM emblem and wordmark: traced to SVG from the files CICM supplied. Ring lettering reset in FreeSans Bold.
- 3D emblem (`assets/cicm-emblem.glb`): built in Blender from the traced shapes (`build_emblem.py`).
- Thammasat University emblem: Wikimedia Commons, "Emblem of Thammasat University.svg".
- Photos: CICM_Dermatology Facebook page.
- Faculty portraits and course tables: cicm.tu.ac.th Dermatology page.
- Film and hero loop: the CICM Dermatology program film.
- Fonts: Bai Jamjuree, Anuphan, Source Serif 4 and Noto Serif Thai (SIL Open Font License), self-hosted.
- World map: Natural Earth via world-atlas.
