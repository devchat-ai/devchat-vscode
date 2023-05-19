# Automated Publishing Process for DevChat VSCode Extension

This document aims to explain the automated publishing process for our DevChat VSCode Extension.
We use CircleCI for continuous integration and deployment to streamline the development and release process.

## Tagging Triggers Publishing

Every time we are ready to publish a new version of the extension, we create a Git tag on the main branch.
The tag's format is vX.X.X (e.g., v1.2.3).

CircleCI is set up to listen for new tags on the main branch. When a new tag is created,
it triggers the publishing workflow, which consists of building the extension and then publishing it to the VSCode Marketplace.

## Tag Number as Version Number

The number part of the Git tag (omitting the v prefix) is used as the version number for the extension.
During the publishing process, we automatically update the version field in package.json with this number.

For example, if the Git tag is v1.2.3, the version number used in package.json will be 1.2.3.

This automation ensures consistency between the Git tags and the published version numbers,
making it easier to manage and track versions.

## Conclusion

Our CircleCI-based publishing process enables a smooth, automated workflow for releasing new versions of the DevChat VSCode Extension.
By using Git tags to trigger releases and denote version numbers, we ensure reliable,
trackable releases that are straightforward for both the development team and the end-users to understand.
