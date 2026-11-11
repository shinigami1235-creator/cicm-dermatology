<?php
/**
 * Turns the posted form (or an imported content.json) into clean data by the schema.
 * Everything is cleaned on the way in; the site escapes again on the way out.
 */
defined( 'ABSPATH' ) || exit;

/** Web, mail and phone links pass, and paths inside the site; anything else (javascript:, data:, //host) becomes "". */
function cicm_clean_url( $u ) {
	$u = trim( (string) $u );
	$u = preg_replace( '/[\x00-\x20\x7f"<>\\\\^`{|}]/', '', $u );
	if ( '' === $u ) {
		return '';
	}
	if ( preg_match( '#^(https?:|mailto:|tel:)#i', $u ) ) {
		return esc_url_raw( $u, array( 'http', 'https', 'mailto', 'tel' ) );
	}
	if ( preg_match( '#^[a-z][a-z0-9+.-]*:#i', $u ) || 0 === strpos( $u, '//' ) ) {
		return '';
	}
	return $u;
}

function cicm_clean_text( $v ) {
	return sanitize_text_field( (string) $v );
}

function cicm_clean_lines( $v ) {
	$list = is_array( $v ) ? $v : preg_split( '/\r\n|\r|\n/', (string) $v );
	$out  = array();
	foreach ( $list as $line ) {
		$line = cicm_clean_text( $line );
		if ( '' !== $line ) {
			$out[] = $line;
		}
	}
	return $out;
}

function cicm_clean_number( $v ) {
	if ( '' === $v || null === $v ) {
		return 0;
	}
	$n = (float) str_replace( ',', '', (string) $v );
	return ( floor( $n ) == $n && abs( $n ) < PHP_INT_MAX ) ? (int) $n : $n;
}

function cicm_clean_field( $f, $v, $groups = array() ) {
	switch ( $f['type'] ) {
		case 'textarea':
			return sanitize_textarea_field( (string) $v );
		case 'url':
		case 'media':
			return cicm_clean_url( $v );
		case 'date':
			$v = (string) $v;
			return preg_match( '/^\d{4}(-\d{2}(-\d{2})?)?$/', $v ) ? $v : '';   // a year, a month or a day
		case 'number':
			return cicm_clean_number( $v );
		case 'bool':
			return ! empty( $v ) && 'false' !== $v && '0' !== $v;
		case 'slug':
			return sanitize_title( (string) $v );
		case 'select':
			return array_key_exists( (string) $v, $f['options'] ) ? (string) $v : '';
		case 'group_ref':
			return in_array( (string) $v, $groups, true ) ? (string) $v : ( $groups ? $groups[0] : '' );
		case 'lines':
			return cicm_clean_lines( $v );
		case 'i18n':
		case 'i18n_area':
			$fn = 'i18n' === $f['type'] ? 'sanitize_text_field' : 'sanitize_textarea_field';
			$v  = is_array( $v ) ? $v : array( 'en' => $v );
			return array(
				'en' => $fn( (string) ( isset( $v['en'] ) ? $v['en'] : '' ) ),
				'th' => $fn( (string) ( isset( $v['th'] ) ? $v['th'] : '' ) ),
			);
		default:
			return cicm_clean_text( $v );
	}
}

/** Reads "a.b" from a nested array. */
function cicm_get_path( $row, $key ) {
	if ( is_array( $row ) && array_key_exists( $key, $row ) ) {
		return $row[ $key ];   // the form posts "fee.thai" as one key
	}
	foreach ( explode( '.', $key ) as $k ) {
		if ( ! is_array( $row ) || ! array_key_exists( $k, $row ) ) {
			return null;
		}
		$row = $row[ $k ];
	}
	return $row;
}

/** Writes "a.b" into a nested array. */
function cicm_set_path( &$row, $key, $value ) {
	$parts = explode( '.', $key );
	$last  = array_pop( $parts );
	$ref   = &$row;
	foreach ( $parts as $k ) {
		if ( ! isset( $ref[ $k ] ) || ! is_array( $ref[ $k ] ) ) {
			$ref[ $k ] = array();
		}
		$ref = &$ref[ $k ];
	}
	$ref[ $last ] = $value;
}

/**
 * Cleans a whole content document.
 * $in: array shaped like content.json (from the form or a file).
 * Returns array( clean, errors ). Rows whose label field is empty are dropped as blank.
 */
function cicm_clean_content( $in ) {
	$schema = cicm_schema();
	$out    = array();
	$errors = array();
	$in     = is_array( $in ) ? $in : array();

	$groups = array();
	if ( isset( $in['visitingGroups'] ) && is_array( $in['visitingGroups'] ) ) {
		foreach ( $in['visitingGroups'] as $g ) {
			$id = sanitize_title( (string) cicm_get_path( $g, 'id' ) );
			if ( '' !== $id ) {
				$groups[] = $id;
			}
		}
	}

	foreach ( $schema as $key => $sec ) {
		$val = isset( $in[ $key ] ) ? $in[ $key ] : null;
		$type = isset( $sec['type'] ) ? $sec['type'] : 'list';

		if ( 'url_lines' === $type ) {
			$list = is_array( $val ) ? $val : preg_split( '/\r\n|\r|\n/', (string) $val );
			$out[ $key ] = array_values( array_filter( array_map( 'cicm_clean_url', $list ) ) );
		} elseif ( 'json' === $type ) {
			if ( is_string( $val ) ) {
				$dec = json_decode( wp_unslash( $val ), true );
				if ( null === $dec && 'null' !== trim( $val ) ) {
					$errors[] = $sec['label'] . ': the JSON is not valid (' . json_last_error_msg() . ').';
					$dec = null;
				}
				$val = $dec;
			}
			$out[ $key ] = cicm_clean_json_tree( is_array( $val ) ? $val : array() );
		} elseif ( 'date' === $type ) {
			$out[ $key ] = cicm_clean_field( array( 'type' => 'date' ), $val );
		} else {
			$rows = array();
			foreach ( ( is_array( $val ) ? $val : array() ) as $row ) {
				if ( ! is_array( $row ) ) {
					continue;
				}
				$clean = array();
				foreach ( $sec['fields'] as $fk => $f ) {
					cicm_set_path( $clean, $fk, cicm_clean_field( $f, cicm_get_path( $row, $fk ), $groups ) );
				}
				$label = cicm_get_path( $clean, $sec['item'] );
				$label = is_array( $label ) ? $label['en'] . $label['th'] : (string) $label;
				if ( '' === trim( $label ) ) {
					continue;
				}
				$rows[] = $clean;
			}
			$out[ $key ] = $rows;
		}
	}

	// IDs must be unique where the site looks people up by ID
	foreach ( array( 'faculty', 'visiting', 'visitingGroups', 'programs', 'staff' ) as $key ) {
		$seen = array();
		foreach ( $out[ $key ] as $i => $row ) {
			$id = isset( $row['id'] ) ? $row['id'] : '';
			if ( '' === $id ) {
				$errors[] = $schema[ $key ]['label'] . ': row ' . ( $i + 1 ) . ' needs an ID.';
			} elseif ( isset( $seen[ $id ] ) ) {
				$errors[] = $schema[ $key ]['label'] . ': the ID "' . $id . '" is used twice.';
			}
			$seen[ $id ] = true;
		}
	}
	return array( $out, $errors );
}

/** Curriculum JSON: keep the structure, clean every string. */
function cicm_clean_json_tree( $v ) {
	if ( is_array( $v ) ) {
		$o = array();
		foreach ( $v as $k => $x ) {
			$o[ is_int( $k ) ? $k : sanitize_text_field( (string) $k ) ] = cicm_clean_json_tree( $x );
		}
		return $o;
	}
	if ( is_string( $v ) ) {
		return sanitize_text_field( $v );
	}
	return ( is_int( $v ) || is_float( $v ) || is_bool( $v ) ) ? $v : null;
}
