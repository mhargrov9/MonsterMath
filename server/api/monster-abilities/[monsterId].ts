import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { abilities, monsterAbilities } from '../../../db/schema';

export default async function handler(req: Request, res: Response) {
  const { monsterId } = req.params;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Query the new relational structure
    const result = await db
      .select({
        id: abilities.id,
        name: abilities.name,
        mp_cost: abilities.mp_cost,
        power_multiplier: abilities.power_multiplier,
        affinity: abilities.affinity,
        ability_type: abilities.ability_type,
        status_effect: abilities.status_effect,
        min_hits: abilities.min_hits,
        max_hits: abilities.max_hits,
        override_affinity: monsterAbilities.override_affinity
      })
      .from(abilities)
      .innerJoin(monsterAbilities, eq(abilities.id, monsterAbilities.ability_id))
      .where(eq(monsterAbilities.monster_id, parseInt(monsterId)));

    // Apply affinity overrides (especially for Basic Attack)
    const processedAbilities = result.map(ability => ({
      ...ability,
      affinity: ability.override_affinity || ability.affinity
    }));

    res.status(200).json({ abilities: processedAbilities });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch monster abilities' });
  }
}