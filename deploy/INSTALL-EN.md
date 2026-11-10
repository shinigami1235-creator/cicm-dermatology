# CICM Dermatology website: install notes

I built this website for the Dermatology (International Program) and it is ready to try on your server. It is plain HTML, CSS and JavaScript with no PHP and no database, so nothing needs to be installed on nginx 1.30.6. Please copy the `dermatology` folder into the web root and open https://cicm.tu.ac.th/dermatology/.

## What is in this package

| Item | Use |
| --- | --- |
| `dermatology/` | The website. Copy this folder to the server. |
| `nginx-dermatology.conf` | nginx settings for the `/dermatology` address and caching |
| `INSTALL-EN.md`, `INSTALL-TH.md` | These notes in English and Thai |

## Try it on localhost

1. Copy `dermatology/` into the web root of your local nginx, for example `/var/www/html/dermatology/` on Linux or `C:\nginx\html\dermatology\` on Windows.
2. Open http://localhost/dermatology/ in a browser.

Open the site through nginx rather than double-clicking `index.html` since the pages load their content from `data/*.json`, which browsers block on `file://` addresses.

## Install on cicm.tu.ac.th

1. Copy `dermatology/` into the web root of cicm.tu.ac.th so the home page sits at `<web root>/dermatology/index.html`.
2. Paste the two blocks from `nginx-dermatology.conf` into the `server` block for cicm.tu.ac.th and change `root` to your web root.
3. Run `nginx -t`, then `nginx -s reload`.
4. Open https://cicm.tu.ac.th/dermatology/ and check that the photos, the program film and the research tables load.

Every link inside the site is relative, so the folder works under `/dermatology/` without any change to the code.

## Three designs for the teachers

The site carries three designs so the teachers can choose one:

| Design | Home page |
| --- | --- |
| Skin layers | `index.html` |
| Atlas plates | `atlas.html` |
| Program book | `book.html` |

The square button at the bottom right of every page switches between them. Once the teachers choose, I will remove the other two designs and the button.

## Before launch

- Every page carries `<meta name="robots" content="noindex, nofollow">` so Google does not list the site yet. I will remove it once CICM approves the site.
- The same site runs as a preview at https://shinigami1235-creator.github.io/cicm-dermatology/. I will switch that copy off once the site is live on cicm.tu.ac.th.
- The old Dermatology page at https://www.cicm.tu.ac.th/academicG-DM.php can redirect to https://cicm.tu.ac.th/dermatology/ once the site is live.

## Your server and the editing backend

The website needs nothing from PHP or the database today. Staff editing comes later as a WordPress backend, and these are the points to prepare for it:

| Item | Your server | What it needs |
| --- | --- | --- |
| nginx | 1.30.6 | Ready |
| PHP | 8.4.27 | Ready |
| MariaDB | 10.5.29 | Please upgrade to 10.11 LTS or 11.4 LTS before the backend goes in since 10.5 reached end of life on 24 June 2025 and gets no more security fixes. WordPress still runs on 10.5, but its current recommendation is 10.6 or newer. |
| PHP extensions | mysqli, curl, mbstring | Please add gd or imagick, exif, fileinfo, intl, xml (dom) and zip. WordPress uses gd or imagick to resize the photos staff upload. |
| Server charset | latin1 | Create the site's database as `utf8mb4` with `utf8mb4_unicode_ci` since Thai text needs it. |
| Database user | root3 | Create a separate user that can reach only the site's database. |
| Upload size | | Set `client_max_body_size` in nginx and `upload_max_filesize` and `post_max_size` in PHP to at least 64M for PDF forms and photos. |

Please tell me once the site opens on localhost, or send me a screenshot of anything that fails.
