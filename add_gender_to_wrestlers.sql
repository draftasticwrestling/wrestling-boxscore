-- Add gender column to wrestlers table
ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- Update gender information for wrestlers
-- This is based on current WWE roster information

-- Male wrestlers
UPDATE wrestlers SET gender = 'male' WHERE id IN (
  'finn-balor',
  'jd-mcdonagh', 
  'dominik-mysterio',
  'erik',
  'ivar',
  'akira-tozawa',
  'otis',
  'julius-creed',
  'brutus-creed',
  'chad-gable',
  'austin-theory',
  'grayson-waller',
  'tommaso-ciampa',
  'johnny-gargano',
  'chris-sabin',
  'alex-shelley',
  'nathan-frazer',
  'axiom',
  'elton-prince',
  'kit-wilson',
  'angel',
  'berto',
  'santos-escobar',
  'tama-tonga',
  'tonga-loa',
  'talla-tonga',
  'carmelo-hayes',
  'the-miz',
  'dexter-lumis',
  'joe-gacy',
  'erick-rowan',
  'angelo-dawkins',
  'montez-ford',
  'jey-uso',
  'jimmy-uso',
  'kofi-kingston',
  'xavier-woods',
  'cruz-del-toro',
  'dragon-lee',
  'joaquin-wilde',
  'rey-mysterio'
);

-- Female wrestlers  
UPDATE wrestlers SET gender = 'female' WHERE id IN (
  'raquel-rodriguez',
  'roxanne-perez',
  'liv-morgan',
  'zaria',
  'sol-ruca',
  'kairi-sane',
  'asuka',
  'chelsea-green',
  'alba-fyre',
  'piper-niven'
);

-- Set default gender for any remaining wrestlers
UPDATE wrestlers SET gender = 'male' WHERE gender IS NULL;
