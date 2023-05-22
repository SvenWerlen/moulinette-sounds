# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [11.0.2] - 2023-05-07
### Fixed
- 11.0.2: Official support for V11
- 11.0.1: Soundboard not callable by macro
### Changed
- Indexes are now world-specific
- Optimizations for The Forge (hosting provider) & S3

## [10.7.0] - 2023-03-24
### Added
- Categories/tags for Tabletop Audio music

## [10.6.0] - 2023-03-21
### Added
- API for retrieving the URL of an asset

## [10.5.0] - 2023-02-19
### Added
- Marketplace integration (available sounds/music)

## [10.4.0] - 2022-01-28
### Changed
- New look-and-feel general availability

## [10.3.0] - 2022-12-22
### Changed
- New interface (auto-scroll lists, breadcrumbs)
- Improved footer
- Export/import/delete Soundboard
### Added
- Whole word search & regex search

## [10.2.0] - 2022-11-13
### Added
- Improved UI for "in progress" indexing

## [10.1.2] - 2022-10-30
### Fixed
- 10.1.1: Unable to play audio files indexed from The Forge (User Data or The Bazaar) #9
- 10.1.2: fix V10 compatibility
### Changed
- Sources filtered for sounds only

## [10.0.3] - 2022-09-02
### Fixed
- 10.0.1: fix packaging issue with v10
- 10.0.2: fix conflict with Pathfinder Ui module
- 10.0.3: #8 Drag-and-drop to playlist broken on v10
### Changed
- Compatibility with V10
- Major version based on FVTT

## [3.7.0] - 2022-05-15
### Changed
- Manage sources (for indexing process)

## [3.6.0] - 2022-02-17
### Changed
- Configuration for choosing if sounds (from SoundPad) must be downloaded or streamed directly from Moulinette Cloud

## [3.5.1] - 2022-02-12
### Fixed
- 3.5.1: sound download not working in some cases
### Changed
- Sounds are automatically downloaded from SoundPad for TTA supporters (5$/mo+)
- Drag & Drop sounds from sound pad, including ambience sound
- Warning for TTA supporters (3$/mo) to inform them about sounds being valid for 24h only

## [3.4.0] - 2022-02-06
### Added
- Support for WebM and FLAC audio format

## [3.3.0] - 2022-01-31
### Fixed
- Special Char Can Make Music Don't work #6
- Drag & drop to playlist doesn't work on V9 (anymore)
### Changed
- UI harmonization (refactoring)
- Preview sound
- Index and show sound duration

## [3.2.0] - 2022-01-15
### Changed
- Keybind from FoundryVTT (doesn't require extra module anymore)

## [3.1.0] - 2021-12-29
### Added
- Volume control for SoundPad (Tabletop)
- SoundPad volume stored as world settings

## [3.0.1] - 2021-12-23
### Changed
- Add support for FVTT 9.x version

## [2.13.0] - 2021-12-12
### Added
- Add button to open SoundPad UI without the shortcut (ALT+S)

## [2.12.0] - 2021-12-04
- Tabletop Audio integration (music & ambiences)

## [2.11.7] - 2021-12-01
### Fixed
- 2.11.7 : 2.11.6 fails when sound menu selected
- 2.11.5/2.11.6 : TTA not properly listed when user change subscription from 3$+ to 5$+
- 2.11.4 : tentative fix for split error
- 2.11.3 : support for PopOut!
- 2.11.2 : reduce font-size of folders (too big!)
- 2.11.1 : bug blocking UI to open
### Added
- Copy sound path to clipboard

## [2.10.0] - 2021-11-20
### Added
- Tabletop Audio integration (soundpad)

## [2.9.0] - 2021-09-02
### Added
- Support for Moulinette Cloud (private storage)

## [2.8.0] - 2021-07-27
### Added
- (#3) Configuration for sounds with mode "repeat" by default

## [2.7.0] - 2021-07-27
### Added
- (#5) Drag & drop sounds into playlist

## [2.6.1] - 2021-06-27
### Added
- Support for new view mode (browse). Fix.
### Fixed
- 2.6.1: Playlists creation don't work on 0.8.x (even corrupt playlist.db)
- 2.6.1: Click on sound name doesn't check box

## [2.5.0] - 2021-06-24
### Added
- Support for Moulinette Cloud

## [2.4.0] - 2021-06-17
### Added
- Support for .m4u as sound files

## [2.3.0] - 2021-06-16
### Added
- Browse mode by creator (rather than pack)

## [2.2.0] - 2021-06-14
### Added
- Drag & drop capabilities for sounds
- Select a sound and then create a new sounds

## [2.1.1] - 2021-06-12
### Added
- Support for new view mode (browse)
### Fixed
- Indexing doesn't clear the cache

## [2.0.0] - 2021-05-24
### Added
- Compatibility with FVTT 0.8.5

## [1.5.0] - 2021-05-15
### Added
- Pin soundboard

## [1.4.0] - 2021-05-11
### Added
- DisplayMode : tiles / list

## [1.3.0] - 2021-05-03
### Added
- Moulinette scans other sources (defined by other modules)

## [1.2.0] - 2021-05-03
### Added
- Support for webm format

## [1.1.0] - 2021-04-28
### Added
- Support for S3 as storage

## [1.0.3] - 2021-04-18
### Added
- Download, install, manage sounds
- Create your own soundboard
