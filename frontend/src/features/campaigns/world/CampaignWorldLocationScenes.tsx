import type React from "react";
import type { LocationDetailTab } from "./CampaignWorldLocationModeTabs";
import type { LocationProfileInfo } from "./locationProfiles";

export function ProfileScene({
  activeTab,
  profile,
  sections,
  tabBar,
}: {
  activeTab: LocationDetailTab;
  profile: LocationProfileInfo;
  sections: Record<string, React.ReactNode>;
  tabBar: React.ReactNode;
}) {
  const persistentSpatialContext = hasPersistentSpatialContext(profile) ? (
    <SceneSection name="mapCard" sections={sections} />
  ) : null;
  const overview = overviewScene(profile, sections, Boolean(persistentSpatialContext));
  return (
    <div className="campaign-world-scene-shell grid min-w-0 gap-4">
      {persistentSpatialContext}
      {tabBar}
      {activeTab === "overview" ? (
        overview
      ) : (
        <FocusedTabScene activeTab={activeTab} profile={profile} sections={sections} />
      )}
    </div>
  );
}

function overviewScene(
  profile: LocationProfileInfo,
  sections: Record<string, React.ReactNode>,
  mapIsPersistent: boolean,
) {
  if (profile.profile === "shop") return <ShopScene sections={sections} />;
  if (profile.profile === "room") {
    return <RoomScene sections={sections} mapIsPersistent={mapIsPersistent} />;
  }
  if (profile.variant === "dungeon" || profile.variant === "floor") {
    return <DungeonScene sections={sections} mapIsPersistent={mapIsPersistent} />;
  }
  if (profile.variant === "town") {
    return <TownScene sections={sections} mapIsPersistent={mapIsPersistent} />;
  }
  return <RegionScene sections={sections} mapIsPersistent={mapIsPersistent} />;
}

function hasPersistentSpatialContext(profile: LocationProfileInfo) {
  return (
    profile.profile === "room" ||
    profile.variant === "region" ||
    profile.variant === "town" ||
    profile.variant === "dungeon" ||
    profile.variant === "floor"
  );
}

function RegionScene({
  sections,
  mapIsPersistent,
}: {
  sections: Record<string, React.ReactNode>;
  mapIsPersistent: boolean;
}) {
  return (
    <div className="campaign-world-scene campaign-world-scene--region grid min-w-0 gap-4">
      <SceneGrid className="2xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.72fr)]">
        {mapIsPersistent ? (
          <SceneSection name="childCard" sections={sections} />
        ) : (
          <SceneSection name="mapCard" sections={sections} />
        )}
        <SceneStack>
          <SceneSection name="travelCard" sections={sections} />
          <SceneSection name="notesCard" sections={sections} />
        </SceneStack>
      </SceneGrid>
      <SceneGrid className="2xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)]">
        {mapIsPersistent ? null : <SceneSection name="childCard" sections={sections} />}
        <SceneStack>
          <SceneSection name="linksCard" sections={sections} />
        </SceneStack>
      </SceneGrid>
    </div>
  );
}

function TownScene({
  sections,
  mapIsPersistent,
}: {
  sections: Record<string, React.ReactNode>;
  mapIsPersistent: boolean;
}) {
  return (
    <SceneGrid className="campaign-world-scene campaign-world-scene--town 2xl:grid-cols-[minmax(0,1.42fr)_minmax(23rem,0.78fr)]">
      <SceneStack>
        {mapIsPersistent ? null : <SceneSection name="mapCard" sections={sections} />}
        <SceneSection name="childCard" sections={sections} />
      </SceneStack>
      <SceneStack>
        <SceneSection name="npcsCard" sections={sections} />
        <SceneSection name="travelCard" sections={sections} />
        <SceneSection name="notesCard" sections={sections} />
      </SceneStack>
    </SceneGrid>
  );
}

function DungeonScene({
  sections,
  mapIsPersistent,
}: {
  sections: Record<string, React.ReactNode>;
  mapIsPersistent: boolean;
}) {
  return (
    <div className="campaign-world-scene campaign-world-scene--dungeon grid min-w-0 gap-4">
      <SceneGrid className="2xl:grid-cols-[minmax(0,1.36fr)_minmax(24rem,0.82fr)]">
        <SceneStack>
          {mapIsPersistent ? null : <SceneSection name="mapCard" sections={sections} />}
          <SceneSection name="childCard" sections={sections} />
          <SceneSection name="prepCard" sections={sections} />
        </SceneStack>
        <SceneStack>
          <SceneSection name="encountersCard" sections={sections} />
        </SceneStack>
      </SceneGrid>
    </div>
  );
}

function RoomScene({
  sections,
  mapIsPersistent,
}: {
  sections: Record<string, React.ReactNode>;
  mapIsPersistent: boolean;
}) {
  return (
    <div className="campaign-world-scene campaign-world-scene--room grid min-w-0 gap-4">
      <SceneFlow>
        {mapIsPersistent ? null : <SceneSection name="mapCard" sections={sections} />}
        <SceneSection name="encountersCard" sections={sections} />
        <SceneSection name="prepCard" sections={sections} />
        <SceneSection name="npcsCard" sections={sections} />
        <SceneSection name="parentCard" sections={sections} />
      </SceneFlow>
    </div>
  );
}

function ShopScene({ sections }: { sections: Record<string, React.ReactNode> }) {
  return (
    <SceneFlow className="campaign-world-scene campaign-world-scene--shop">
      <SceneSection name="npcsCard" sections={sections} />
      <SceneSection name="notesCard" sections={sections} />
      <SceneSection name="mapCard" sections={sections} />
    </SceneFlow>
  );
}

function FocusedTabScene({
  activeTab,
  profile,
  sections,
}: {
  activeTab: LocationDetailTab;
  profile: LocationProfileInfo;
  sections: Record<string, React.ReactNode>;
}) {
  const order = focusedTabOrder(activeTab, profile).filter((name) => Boolean(sections[name]));
  if (order.length <= 1) {
    return (
      <div className="campaign-world-focused-scene grid min-w-0 gap-4">
        {order.map((name) => renderSceneSection(name, sections))}
      </div>
    );
  }
  const splitAt = Math.ceil(order.length / 2);
  return (
    <div className="campaign-world-focused-scene grid min-w-0 gap-4">
      <SceneGrid className="2xl:grid-cols-[minmax(0,1.32fr)_minmax(23rem,0.78fr)]">
        <SceneStack>
          {order.slice(0, splitAt).map((name) => renderSceneSection(name, sections))}
        </SceneStack>
        <SceneStack>
          {order.slice(splitAt).map((name) => renderSceneSection(name, sections))}
        </SceneStack>
      </SceneGrid>
    </div>
  );
}

function SceneGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`campaign-world-scene-grid grid min-w-0 items-start gap-4 ${className}`}>
      {children}
    </div>
  );
}

function SceneStack({ children }: { children: React.ReactNode }) {
  return (
    <div className="campaign-world-scene-stack grid min-w-0 content-start gap-4">{children}</div>
  );
}

function SceneFlow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`campaign-world-balanced-flow min-w-0 ${className}`}>{children}</div>;
}

function SceneSection({
  name,
  sections,
}: {
  name: string;
  sections: Record<string, React.ReactNode>;
}) {
  return renderSceneSection(name, sections);
}

function renderSceneSection(name: string, sections: Record<string, React.ReactNode>) {
  const section = sections[name];
  if (!section) return null;
  return (
    <div className="min-w-0" key={name}>
      {section}
    </div>
  );
}

function focusedTabOrder(activeTab: LocationDetailTab, profile: LocationProfileInfo) {
  if (activeTab === "inventory") return ["stockCard", "childCard"];
  if (activeTab === "people") return ["npcsCard"];
  if (activeTab === "encounters") return ["encountersCard"];
  if (activeTab === "notes") return ["notesCard"];
  if (activeTab === "connections") return ["linksCard", "travelCard", "parentCard"];
  if (profile.profile === "shop") return ["stockCard", "childCard", "parentCard"];
  if (profile.variant === "dungeon" || profile.variant === "floor") {
    return ["childCard"];
  }
  return ["childCard", "travelCard"];
}
