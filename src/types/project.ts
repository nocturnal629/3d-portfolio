export interface Project {
  title: string;
  description: string;
  tech: string[];
  link?: string;
  image?: string;
  /** CSS `object-position` for the banner. The card crops to 16:9 from the
   *  centre, which cuts the subject off a very wide image; set this (e.g.
   *  `"left"`) to choose which part of it survives the crop. */
  imagePosition?: string;
}