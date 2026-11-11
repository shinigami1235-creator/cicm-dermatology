<?php
/**
 * What staff can edit, section by section. The keys match data/content.json, which the site reads.
 *
 * Field types:
 *   text, textarea, url, date, number, bool, slug, select (options), media (a URL picked from the media library),
 *   i18n (English + Thai text), i18n_area (English + Thai paragraphs), lines (one item per line -> list of strings).
 * A key with a dot ("fee.thai") is stored nested: { "fee": { "thai": ... } }.
 */
defined( 'ABSPATH' ) || exit;

function cicm_schema() {
	$ranks = array( '' => '-', 'Prof.' => 'Prof.', 'Assoc. Prof.' => 'Assoc. Prof.', 'Asst. Prof.' => 'Asst. Prof.' );
	return array(
		'announcements' => array(
			'label' => 'Announcements',
			'help'  => 'The newest four show on the home page. Pinned ones go first.',
			'item'  => 'title',
			'fields' => array(
				'date'   => array( 'type' => 'date', 'label' => 'Date', 'hint' => '2026, 2026-11 or 2026-11-11' ),
				'tag'    => array( 'type' => 'i18n', 'label' => 'Tag', 'hint' => 'Admissions 2027' ),
				'title'  => array( 'type' => 'i18n', 'label' => 'Title' ),
				'link'   => array( 'type' => 'url', 'label' => 'Link', 'hint' => 'A page, a PDF from the media library, or blank for Downloads' ),
				'pinned' => array( 'type' => 'bool', 'label' => 'Pinned' ),
			),
		),
		'programs' => array(
			'label' => 'Programs and fees',
			'item'  => 'name',
			'fields' => array(
				'id'          => array( 'type' => 'slug', 'label' => 'ID', 'hint' => 'clinical' ),
				'code'        => array( 'type' => 'text', 'label' => 'Code', 'hint' => 'M.Sc.' ),
				'name'        => array( 'type' => 'i18n', 'label' => 'Name' ),
				'degree'      => array( 'type' => 'i18n', 'label' => 'Degree' ),
				'focus'       => array( 'type' => 'i18n_area', 'label' => 'What it covers' ),
				'length'      => array( 'type' => 'i18n', 'label' => 'Length', 'hint' => '2 years, 42 credits' ),
				'fee.thai'    => array( 'type' => 'number', 'label' => 'Fee per semester, Thai students (THB)' ),
				'fee.foreign' => array( 'type' => 'number', 'label' => 'Fee per semester, foreign students (THB)' ),
			),
		),
		'faculty' => array(
			'label' => 'Permanent lecturers',
			'help'  => 'Shown in the card deck, the orbit and on the faculty page, in this order.',
			'item'  => 'name',
			'fields' => array(
				'id'           => array( 'type' => 'slug', 'label' => 'ID', 'hint' => 'jitlada' ),
				'name'         => array( 'type' => 'text', 'label' => 'Name' ),
				'title'        => array( 'type' => 'select', 'label' => 'Academic rank', 'options' => $ranks ),
				'post'         => array( 'type' => 'text', 'label' => 'Degrees', 'hint' => 'M.D., Ph.D.' ),
				'photo'        => array( 'type' => 'media', 'label' => 'Profile photo (square)' ),
				'cut'          => array( 'type' => 'media', 'label' => 'Cut-out portrait for the card deck', 'hint' => 'A tall PNG or WebP with a transparent background. Leave blank to use the profile photo.' ),
				'education'    => array( 'type' => 'lines', 'label' => 'Education', 'hint' => 'One per line' ),
				'expertise'    => array( 'type' => 'lines', 'label' => 'Expertise', 'hint' => 'One per line' ),
				'pubmed'       => array( 'type' => 'text', 'label' => 'Name on PubMed', 'hint' => 'Meephansan J' ),
				'scopus.id'    => array( 'type' => 'text', 'label' => 'Scopus author ID' ),
				'scopus.docs'  => array( 'type' => 'number', 'label' => 'Scopus documents' ),
				'scopus.cites' => array( 'type' => 'number', 'label' => 'Scopus citations' ),
				'scopus.h'     => array( 'type' => 'number', 'label' => 'Scopus h-index' ),
			),
		),
		'visiting' => array(
			'label' => 'Visiting lecturers',
			'help'  => 'Grouped on the site by the hospital chosen here.',
			'item'  => 'name',
			'fields' => array(
				'id'        => array( 'type' => 'slug', 'label' => 'ID', 'hint' => 'wilai' ),
				'name'      => array( 'type' => 'text', 'label' => 'Name' ),
				'title'     => array( 'type' => 'select', 'label' => 'Academic rank', 'options' => $ranks ),
				'post'      => array( 'type' => 'text', 'label' => 'Degrees' ),
				'photo'     => array( 'type' => 'media', 'label' => 'Portrait', 'hint' => 'Head and shoulders, transparent background, about 530 x 640' ),
				'role'      => array( 'type' => 'text', 'label' => 'Role', 'hint' => 'Head of the Division of Dermatology' ),
				'place'     => array( 'type' => 'text', 'label' => 'Workplace', 'hint' => 'Rajavithi Hospital' ),
				'group'     => array( 'type' => 'group_ref', 'label' => 'Hospital group' ),
				'education' => array( 'type' => 'lines', 'label' => 'Education' ),
				'expertise' => array( 'type' => 'lines', 'label' => 'Expertise' ),
			),
		),
		'visitingGroups' => array(
			'label' => 'Hospital groups',
			'help'  => 'The headings over the visiting lecturers, in this order.',
			'item'  => 'name',
			'fields' => array(
				'id'   => array( 'type' => 'slug', 'label' => 'ID', 'hint' => 'rajavithi' ),
				'name' => array( 'type' => 'i18n', 'label' => 'Name' ),
			),
		),
		'staff' => array(
			'label' => 'Academic officers',
			'item'  => 'name',
			'fields' => array(
				'id'        => array( 'type' => 'slug', 'label' => 'ID' ),
				'name'      => array( 'type' => 'text', 'label' => 'Name' ),
				'photo'     => array( 'type' => 'media', 'label' => 'Photo' ),
				'role'      => array( 'type' => 'i18n', 'label' => 'Role' ),
				'education' => array( 'type' => 'lines', 'label' => 'Education' ),
			),
		),
		'achievements' => array(
			'label' => 'Achievements',
			'item'  => 'text',
			'fields' => array(
				'faculty' => array( 'type' => 'slug', 'label' => 'Lecturer ID', 'hint' => 'jitlada' ),
				'year'    => array( 'type' => 'text', 'label' => 'Year' ),
				'text'    => array( 'type' => 'i18n', 'label' => 'Achievement' ),
				'link'    => array( 'type' => 'url', 'label' => 'Link' ),
			),
		),
		'downloads' => array(
			'label' => 'Downloads',
			'item'  => 'title',
			'fields' => array(
				'group' => array( 'type' => 'text', 'label' => 'Group', 'hint' => 'Forms' ),
				'title' => array( 'type' => 'i18n', 'label' => 'Title' ),
				'url'   => array( 'type' => 'url', 'label' => 'File or link' ),
			),
		),
		'partners' => array(
			'label' => 'Training abroad partners',
			'item'  => 'name',
			'fields' => array(
				'name'   => array( 'type' => 'text', 'label' => 'Name' ),
				'place'  => array( 'type' => 'text', 'label' => 'City and country', 'hint' => 'Rotterdam, Netherlands' ),
				'lon'    => array( 'type' => 'number', 'label' => 'Longitude', 'step' => 'any' ),
				'lat'    => array( 'type' => 'number', 'label' => 'Latitude', 'step' => 'any' ),
				'mou'    => array( 'type' => 'bool', 'label' => 'MOU signed' ),
				'photos' => array( 'type' => 'lines', 'label' => 'Photo names', 'hint' => 'One per line, as in the photos folder, without .webp' ),
			),
		),
		'facebookPosts' => array(
			'label' => 'Facebook posts',
			'help'  => 'One post link per line, newest first.',
			'type'  => 'url_lines',
		),
		'curriculum' => array(
			'label' => 'Curriculum (advanced)',
			'help'  => 'The study plans as JSON. Saving is refused if the JSON is not valid.',
			'type'  => 'json',
		),
		'scopusUpdated' => array(
			'label' => 'Scopus figures updated on',
			'type'  => 'date',
		),
	);
}
