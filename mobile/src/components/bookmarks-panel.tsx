import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FolderInput, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { countIn, filterMarks, folderOf, markKeyOf } from '@/lib/folders';
import { useLibrary } from '@/context/library';
import { useSettings } from '@/context/settings';

interface Props {
  surahName: (n: number) => string;
}

function Chip({ label, count, on, onPress }: { label: string; count?: number; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      className={cn('min-h-10 flex-row items-center gap-1.5 rounded-full border px-4', on ? 'border-primary bg-primary' : 'border-border bg-card')}
    >
      <Text className={cn('text-sm', on && 'text-primary-foreground')}>{label}</Text>
      {count !== undefined ? <Text className={cn('text-xs', on ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{count}</Text> : null}
    </Pressable>
  );
}

/** The bookmarks list of the More screen, with folders: filter by folder, make folders, file a bookmark into one. */
export function BookmarksPanel({ surahName }: Props) {
  const router = useRouter();
  const { t } = useSettings();
  const { bookmarks, folders, createFolder, renameBookmarkFolder, deleteFolder, moveBookmark, toggleBookmark } = useLibrary();
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);

  // A filter pointing at a folder that no longer exists falls back to all.
  const active = filter === 'all' || filter === 'none' || folders.folders.some(f => f.id === filter) ? filter : 'all';
  const shown = filterMarks(folders, bookmarks, active);
  const activeFolder = folders.folders.find(f => f.id === active) ?? null;

  const submit = () => {
    const ok = renaming && activeFolder ? renameBookmarkFolder(activeFolder.id, name) : createFolder(name);
    if (!ok) { setError(true); return; }
    setError(false);
    setAdding(false);
    setRenaming(false);
    setName('');
  };
  const cancel = () => { setAdding(false); setRenaming(false); setName(''); setError(false); };

  return (
    <View className="gap-3 border-b border-border bg-muted/40 p-3">
      {/* Folders */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        <Chip label={t('foldersAll')} count={bookmarks.length} on={active === 'all'} onPress={() => setFilter('all')} />
        {folders.folders.map(f => (
          <Chip key={f.id} label={f.name} count={countIn(folders, bookmarks, f.id)} on={active === f.id} onPress={() => setFilter(f.id)} />
        ))}
        {folders.folders.length > 0 ? <Chip label={t('foldersNone')} count={countIn(folders, bookmarks, 'none')} on={active === 'none'} onPress={() => setFilter('none')} /> : null}
        <Pressable onPress={() => { setAdding(true); setRenaming(false); setName(''); setError(false); }} accessibilityRole="button" accessibilityLabel={t('foldersNew')} className="min-h-10 flex-row items-center gap-1 rounded-full border border-dashed border-primary px-3 active:opacity-70">
          <Icon as={Plus} className="size-4 text-primary" />
          <Text className="text-sm text-primary">{t('foldersNew')}</Text>
        </Pressable>
      </ScrollView>

      {/* New / rename */}
      {adding || renaming ? (
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <Input value={name} onChangeText={v => { setName(v); setError(false); }} placeholder={t('foldersNamePlaceholder')} accessibilityLabel={t('foldersNamePlaceholder')} maxLength={30} autoFocus onSubmitEditing={submit} returnKeyType="done" className="h-11 flex-1 rounded-xl bg-card" />
            <Button className="h-11 rounded-xl px-4" onPress={submit}><Text>{renaming ? t('foldersRename') : t('foldersAdd')}</Text></Button>
            <Button variant="ghost" size="icon" className="size-11" onPress={cancel} accessibilityLabel={t('cancel')}><Icon as={X} className="size-5" /></Button>
          </View>
          {error ? <Text accessibilityRole="alert" className="px-1 text-sm text-destructive">{t('foldersTaken')}</Text> : null}
        </View>
      ) : null}

      {/* Folder actions */}
      {activeFolder && !adding && !renaming ? (
        <View className="flex-row flex-wrap gap-2">
          <Button variant="outline" className="h-10 rounded-full px-4" onPress={() => { setRenaming(true); setName(activeFolder.name); setError(false); }}>
            <Icon as={Pencil} className="size-4" />
            <Text className="text-sm">{t('foldersRename')}</Text>
          </Button>
          <Button variant="outline" className="h-10 rounded-full px-4" onPress={() => { deleteFolder(activeFolder.id); setFilter('all'); }} accessibilityHint={t('foldersDeleteHint')}>
            <Icon as={Trash2} className="size-4 text-destructive" />
            <Text className="text-sm text-destructive">{t('foldersDelete')}</Text>
          </Button>
        </View>
      ) : null}

      {/* Bookmarks */}
      {shown.length === 0 ? (
        <Text className="px-1 py-2 text-sm text-muted-foreground">{t('foldersEmpty')}</Text>
      ) : (
        shown.map(b => {
          const key = markKeyOf(b.surah, b.ayah);
          const current = folderOf(folders, key);
          const open = moving === key;
          return (
            <View key={key} className="overflow-hidden rounded-2xl border border-border bg-card">
              <View className="min-h-12 flex-row items-center">
                <Pressable onPress={() => router.push({ pathname: '/surah/[id]', params: { id: String(b.surah), ayah: String(b.ayah) } })} accessibilityRole="button" className="min-h-12 flex-1 flex-row items-center justify-between gap-3 px-4 py-2 active:bg-accent/50">
                  <Text className="text-sm">{surahName(b.surah)}</Text>
                  <Text className="text-sm text-muted-foreground">{t('ayah')} {b.ayah}</Text>
                </Pressable>
                <Pressable onPress={() => setMoving(open ? null : key)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={t('foldersMove')} className="size-12 items-center justify-center active:bg-accent/50">
                  <Icon as={FolderInput} className={cn('size-5', current ? 'text-primary' : 'text-muted-foreground')} />
                </Pressable>
                <Pressable onPress={() => toggleBookmark(b.surah, b.ayah)} accessibilityRole="button" accessibilityLabel={t('foldersRemoveBookmark')} className="size-12 items-center justify-center active:bg-accent/50">
                  <Icon as={X} className="size-5 text-muted-foreground" />
                </Pressable>
              </View>
              {open ? (
                <View className="flex-row flex-wrap gap-2 border-t border-border p-3">
                  <Chip label={t('foldersNone')} on={current === null} onPress={() => { moveBookmark(b.surah, b.ayah, null); setMoving(null); }} />
                  {folders.folders.map(f => (
                    <Chip key={f.id} label={f.name} on={current === f.id} onPress={() => { moveBookmark(b.surah, b.ayah, f.id); setMoving(null); }} />
                  ))}
                  {folders.folders.length === 0 ? <Text className="text-sm text-muted-foreground">{t('foldersNew')} ↑</Text> : null}
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}
