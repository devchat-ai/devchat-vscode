/**
 * Legacy endpoints migrated from language-bridge for ask-code
 *
 * Should remove these endpoints after ask-code migrated to new endpoints
 */

import {
    findDefinitions,
    findDefinitionsOfToken,
} from "./legacy_bridge/feature/find-defs";

import { findReferences } from "./legacy_bridge/feature/find-refs";

export namespace LegacyEndpoints {
    export async function definitions(
        abspath: string,
        line: string | undefined = undefined,
        character: string | undefined = undefined,
        token: string | undefined = undefined
    ) {
        if (token !== undefined) {
            const definitions = await findDefinitionsOfToken(abspath, token);
            return definitions;
        } else {
            const definitions = await findDefinitions(
                abspath,
                Number(line),
                Number(character)
            );
            return definitions;
        }
    }

    export async function references(
        abspath: string,
        line: number,
        character: number
    ) {
        const references = await findReferences(
            abspath,
            Number(line),
            Number(character)
        );

        return references;
    }
}
