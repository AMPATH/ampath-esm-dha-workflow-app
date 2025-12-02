import React from 'react';
import { ConfigurableLink } from '@openmrs/esm-framework';
import classNames from 'classnames';
import { navLinksConfig } from './nav-link-config';

interface NavLinksProps {}
const NavLinks: React.FC<NavLinksProps> = () => {
  return (
    <>
      {navLinksConfig.map((n) => {
        return (
          <ConfigurableLink
            to={`${window.getOpenmrsSpaBase()}home/${n.to}`}
            className={classNames('cds--side-nav__link', '')}
          >
            {n.title}
          </ConfigurableLink>
        );
      })}
    </>
  );
};

export default NavLinks;
