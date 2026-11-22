import { CamadaGroupView } from './CamadaGroupView';
import { CharacterGrid } from './CharacterGrid';
import { EntityGrid } from './EntityGrid';
import { EpisodeItems } from './EpisodeItems';
import { EpisodeReaders } from './EpisodeReaders';
import { FaqList } from './FaqList';
import { GlossaryList } from './GlossaryList';
import { LayerGroupView } from './LayerGroupView';
import { RankGrid } from './RankGrid';
import { SpinoffTabs } from './SpinoffTabs';

/** Liga cada marcador <!--@tipo:arg--> do HTML ao componente que renderiza os dados do banco. */
export function Marker({ kind, arg }: { kind: string; arg?: string }) {
  switch (kind) {
    case 'ep-items': return <EpisodeItems variant={arg === 'spinoff' ? 'spinoff' : 'season'} />;
    case 'ep-readers': return <EpisodeReaders />;
    case 'spinoff-tabs': return <SpinoffTabs />;
    case 'characters': return <CharacterGrid groupId={arg ?? ''} />;
    case 'entities': return <EntityGrid groupId={arg ?? ''} />;
    case 'ranks': return <RankGrid groupId={arg ?? ''} />;
    case 'glossary': return <GlossaryList page={arg ?? ''} />;
    case 'faq': return <FaqList />;
    case 'camadas': return <CamadaGroupView groupId={arg ?? ''} />;
    case 'layers': return <LayerGroupView groupId={arg ?? ''} />;
    default:
      console.warn(`Marcador desconhecido: ${kind}`);
      return null;
  }
}
