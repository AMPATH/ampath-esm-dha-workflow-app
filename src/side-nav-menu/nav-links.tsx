import { SideNavMenuItem } from '@carbon/react';
import React from 'react';

interface NavLinksProps {}
const NavLinks: React.FC<NavLinksProps> = () => {
  return (
    <>
      <SideNavMenuItem href="consultation/dashboard">Dashboard</SideNavMenuItem>
      <SideNavMenuItem href="consultation/registry">Registration</SideNavMenuItem>
      <SideNavMenuItem href="consultation/registry">Appointments</SideNavMenuItem>
      <SideNavMenuItem href="consultation/registry">Triage</SideNavMenuItem>
      <SideNavMenuItem href="consultation/registry">Consultation</SideNavMenuItem>
      <SideNavMenuItem href="consultation/registry">Laboratory</SideNavMenuItem>
      <SideNavMenuItem href="consultation/registry">Bookings</SideNavMenuItem>
      <SideNavMenuItem href="consultation/registry">Reports</SideNavMenuItem>
      <SideNavMenuItem href="consultation/registry">Registers</SideNavMenuItem>
      <SideNavMenuItem href="consultation/registry">Appointments</SideNavMenuItem>
    </>
  );
};

export default NavLinks;
