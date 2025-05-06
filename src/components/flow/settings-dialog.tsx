
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider'; // 导入 Slider 组件
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme, FONT_SIZE_MAP } from '@/context/theme-provider'; // 导入 FONT_SIZE_MAP
import type { Locale, FontSize } from '@/types/flow';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// 定义字体大小选项的顺序，与滑块索引对应
const fontSizeOptionsArray: FontSize[] = ['small', 'default', 'medium', 'large'];

export function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
  const { t, setLocale, locale, availableLanguages } = useTranslation();
  const { theme, setTheme, fontSize, setFontSize } = useTheme();

  const handleThemeChange = (isDark: boolean) => {
    setTheme(isDark ? 'dark' : 'light');
  };

  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale as Locale);
  };

  const currentFontSizeIndex = fontSizeOptionsArray.indexOf(fontSize);

  const handleFontSizeChange = (value: number[]) => {
    const newFontSize = fontSizeOptionsArray[value[0]];
    if (newFontSize) {
      setFontSize(newFontSize);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('settingsDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="language-select" className="text-right col-span-1">
              {t('settingsDialog.languageLabel')}
            </Label>
            <Select value={locale} onValueChange={handleLanguageChange}>
              <SelectTrigger id="language-select" className="col-span-2">
                <SelectValue placeholder={t('settingsDialog.selectLanguagePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="theme-switch" className="text-right col-span-1">
              {t('settingsDialog.themeLabel')}
            </Label>
            <div className="col-span-2 flex items-center space-x-2">
              <Switch
                id="theme-switch"
                checked={theme === 'dark'}
                onCheckedChange={handleThemeChange}
                aria-label={t(theme === 'dark' ? 'settingsDialog.switchToLightModeAriaLabel' : 'settingsDialog.switchToDarkModeAriaLabel')}
              />
              <span>{theme === 'dark' ? t('settingsDialog.darkMode') : t('settingsDialog.lightMode')}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 items-start gap-4">
            <Label className="text-right col-span-1 pt-2">
              {t('settingsDialog.fontSizeLabel')}
            </Label>
            <div className="col-span-2">
              <Slider
                defaultValue={[fontSizeOptionsArray.indexOf('medium')]} // 默认选中 "medium" (16px)
                value={[currentFontSizeIndex]}
                onValueChange={handleFontSizeChange}
                min={0}
                max={fontSizeOptionsArray.length - 1}
                step={1}
                className="my-3" 
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
                {fontSizeOptionsArray.map((fsOption, index) => (
                  <div key={fsOption} className="flex flex-col items-center">
                    <span 
                      className={cn(
                        "h-2.5 w-2.5 rounded-full border-2 bg-background cursor-pointer",
                        currentFontSizeIndex === index ? "border-primary bg-primary" : "border-muted-foreground"
                      )}
                      onClick={() => handleFontSizeChange([index])}
                      role="button"
                      aria-label={`Set font size to ${FONT_SIZE_MAP[fsOption]}`}
                    ></span>
                    <span className="mt-1">{FONT_SIZE_MAP[fsOption]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
