/**
 * Portfolio content used by the viewer.
 * Project text is taken word for word from the portfolio sheets; captions describe each sheet.
 * If you edit a title or a page range here, update the matching row in index.html too.
 */

/** Optional link to the unmodified 171 MB original (Google Drive / Acrobat, "anyone with the link"). */
export const FULL_ORIGINAL_PDF_URL = '';

/** Compact single-file PDF that lives in this repository (built by tools/compact_pdf.py). */
export const COMPACT_PDF = { href: 'Niharika-Patil-Portfolio.pdf', bytes: 20411429 };

export const PAGE_COUNT = 24;

/** Full-resolution zoom tiles (built by tools/build_assets.py tiles). */
export const TILES = { width: 9600, height: 6794, size: 1200, bleed: 2, cols: 8, rows: 6 };

/** Original per-sheet PDF sizes in bytes, so the viewer can say what a download costs. */
export const SHEET_BYTES = [0, 97150, 1116278, 188636, 3373477, 3263339, 5724098, 8439787, 5036371, 919962, 6447740,
  11077038, 11195727, 4670289, 27375305, 17586057, 10956071, 10878867, 12098821, 1954983, 1961086, 11809685,
  6184473, 4013148, 92246];

/** One caption per sheet, index = sheet number. */
export const CAPTIONS = [
  '',
  'Cover',
  'About — profile, education, software and skills',
  'Contents',
  'Exoskeletal Circuit — project overview and aerial render',
  'Masterplan, ground floor · Concept',
  'Form development · Player level, lower and upper main concourse plans',
  'Section AA′ · Exoskeletal circulation towers · Façade',
  'Section BB′ with retractable pitch system · Lower and upper VIP level plans',
  'Samvedana — project overview and courtyard render',
  'Masterplan, ground floor · Massing diagrams · Section AA′',
  'Performance arts block · Corridor and dance studio · Section DD′',
  '3D model · Sections BB′ and CC′ · Interior views',
  'Mitti — project overview and aerial render',
  'Masterplan, ground floor · Sections AA′ and BB′ · Conceptual evolution',
  'Roof plan · Sections CC′ and DD′ · Gallery views',
  'Saanidhya — project overview and aerial render',
  'Masterplan, ground floor · Temple-inspired rampway · Rangoli katte · Section AA′',
  'Conceptual translation · G-1 plan · Section BB′',
  'Excavation plan · Foundations F1 and F2 · Staircase elevation, section, details and plans',
  'Plinth beam, electrical layout and lintel plans · Sections AA′ and BB′, plumbing',
  'Urban design model · Physical models · Pencil sketching · Painting',
  'Photography',
  'Research & spatial translation — Architecture of Choice (ongoing thesis)',
  'Thank you',
];

export const CHAPTERS = [
  { id: 'introduction', number: '00', title: 'Introduction', category: 'Profile & contents', start: 1, end: 3 },
  {
    id: 'exoskeletal-circuit', number: '01', title: 'Exoskeletal Circuit', subtitle: '40,000 Capacity Football Stadium',
    category: 'Stadium design', start: 4, end: 8,
    facts: [['Location', 'Bengaluru'], ['Typology', 'Stadium Design'], ['Area', '36 acres'], ['Semester', 'Semester 7']],
    intro: 'The project explores the design of a 40,000-seat football stadium in Bengaluru, reimagining circulation through an exposed exoskeletal system. Instead of enclosing movement behind a continuous façade, circulation towers open to the surroundings define the stadium’s architectural identity, complemented by organic forms inspired by crowd movement.',
  },
  {
    id: 'samvedana', number: '02', title: 'Samvedana', subtitle: 'Arts Institute for the Visually Impaired',
    category: 'Institutional design', start: 9, end: 12,
    facts: [['Location', 'Bengaluru'], ['Typology', 'Institutional Design'], ['Area', '3.4 acres'], ['Semester', 'Semester 6']],
    intro: 'Located on the highly contoured Karnataka Chitrakala Parishath site in Bengaluru, Samvedana is an arts institute for the visually impaired, integrating performing and visual arts. The design responds to the terrain through interconnected levels, sensory cues, and spatial transitions that encourage independent navigation.',
  },
  {
    id: 'mitti', number: '03', title: 'Mitti', subtitle: 'Pottery Community Centre and Gallery',
    category: 'Cultural design', start: 13, end: 15,
    facts: [['Location', 'Bengaluru'], ['Typology', 'Cultural Design'], ['Area', '2.08 acres'], ['Semester', 'Semester 5']],
    intro: 'Located in Bengaluru’s Pottery Town, Mitti aims to preserve the art of pottery while sustaining the livelihoods of local artisans. The centre provides dedicated spaces for production, display, and year-round sale, creating a shared environment where artisans and visitors can interact, learn, and support the craft.',
  },
  {
    id: 'saanidhya', number: '04', title: 'Saanidhya', subtitle: 'Melukote Spatial Ethnography Centre',
    category: 'Urban design', start: 16, end: 18,
    facts: [['Location', 'Melukote, Mandya'], ['Typology', 'Urban Design'], ['Area', '4.43 acres'], ['Semester', 'Semester 8']],
    intro: 'Melukote’s waterbodies and everyday traditions remain neglected, overshadowed by its temples. Saanidhya integrates the revival of a neglected waterbody with a spatial ethnography centre, creating spaces for cultural engagement, recreation, and locally led workshops that sustain livelihoods and reconnect visitors with the town’s living heritage.',
  },
  {
    id: 'working-drawings', number: '05', title: 'Working Drawings', subtitle: 'Technical drafting',
    category: 'Technical drafting', start: 19, end: 20,
    facts: [['Semester', 'Semester 6–7'], ['Sheets', 'Foundations, staircase, plinth, electrical, lintel, plumbing']],
  },
  {
    id: 'selected-explorations', number: '06', title: 'Selected Explorations', subtitle: 'Research & creative explorations',
    category: 'Research & creative work', start: 21, end: 23,
    facts: [['Includes', 'Models, sketching, painting, photography, thesis research']],
    intro: 'Part of my ongoing thesis, Architecture of Choice, a six-layer women’s centre in Delhi catering to survivors of sexual abuse and violence. The layers progress from everyday public interaction to discreet crisis intervention, individual support, and private recovery, allowing women to choose their degree of visibility, participation, and retreat.',
  },
  { id: 'closing', number: '—', title: 'Contact', category: 'Contact', start: 24, end: 24 },
];
