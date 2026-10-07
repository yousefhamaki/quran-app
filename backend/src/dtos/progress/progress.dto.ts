import { ProgressEntity } from '../../interfaces/progress.interface';

/** With no stored progress the DTO is a null-ish default: surah and ayah are null. */
export class ProgressDto {
  readonly surah: number | null;
  readonly ayah: number | null;
  readonly updatedAt: Date | null;

  constructor(progress?: ProgressEntity | null) {
    this.surah = progress?.surah ?? null;
    this.ayah = progress?.ayah ?? null;
    this.updatedAt = progress?.updatedAt ?? null;
  }
}
