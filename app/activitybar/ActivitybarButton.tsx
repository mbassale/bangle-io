import React from 'react';

import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { cx } from '@bangle.io/utils';

export const buttonStyling = {
  animateOnPress: true,
  activeColor: 'var(--activitybar-button-active-color)',
  color: 'var(--activitybar-button-color)',
  hoverBgColor: 'var(--activitybar-button-hover-bg-color)',
  hoverColor: 'var(--activitybar-button-hover-color)',
  pressedBgColor: 'var(--activitybar-button-pressed-bg-color)',
};

export function ActivitybarButton({
  isActive,
  widescreen,
  icon,
  hint,
  onPress,
}: {
  menu?: boolean;
  widescreen: boolean;
  hint: string;
  isActive?: boolean;
  // key if used in dropdowndow menu
  onPress: (k?: React.Key) => void;
  icon: any;
}) {
  return (
    <ActionButton
      allowFocus={false}
      isQuiet
      isActive={isActive}
      styling={buttonStyling}
      className={cx(
        'w-full py-3 rounded-sm flex justify-center B-activitybar_button',
        widescreen && 'BU_widescreen',
      )}
      onPress={onPress}
      ariaLabel={hint}
      tooltip={<TooltipWrapper>{hint}</TooltipWrapper>}
      tooltipDelay={150}
      tooltipPlacement="right"
    >
      <ButtonContent size="custom" icon={icon}></ButtonContent>
    </ActionButton>
  );
}
