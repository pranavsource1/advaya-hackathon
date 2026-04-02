import React from 'react';
import { render } from '@testing-library/react';
import MapView from './MapView';
import { GeoPosition, SafeZone } from '../types';

// Mock Leaflet and react-leaflet because MapContainer needs a real DOM Map
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: (props: { icon?: { options?: { className?: string } } }) => (
    <div data-testid="marker" className={props.icon?.options?.className} />
  ),
  Circle: () => <div data-testid="circle" />,
  useMap: () => ({ flyTo: jest.fn() })
}));

describe('MapView Component (Human Image Pointer Feature)', () => {
  it('displays the human-like image (avatar) pointer for the user location updating in map', () => {
    const userPosition: GeoPosition = { lat: 40.7128, lng: -74.0060 };
    const safeZone: SafeZone = { center: userPosition, radius: 100 };
    
    const { getAllByTestId } = render(
      <MapView userPosition={userPosition} safeZone={safeZone} />
    );

    const markers = getAllByTestId('marker');

    // Ensure the custom user icon class is rendered which features the human image (🚶‍♂️ avatar)
    const hasUserIcon = markers.some(m => m.className.includes('custom-user-icon'));
    expect(hasUserIcon).toBe(true);
    
    // As it has safezone too, it should also have the custom red circle center marker
    const hasSafeZoneCenterIcon = markers.some(m => m.className.includes('custom-div-icon'));
    expect(hasSafeZoneCenterIcon).toBe(true);
  });
});