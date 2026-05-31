export const GET_FORGE_SETTINGS = /* GraphQL */ `
  query ForgeSettings($siteKey: String!) {
    forgeSettings(siteKey: $siteKey) {
      siteKey
      url
      id
      user
      passwordSet
    }
  }
`;

export const UPDATE_FORGE_SETTINGS = /* GraphQL */ `
  mutation UpdateForgeSettings(
    $siteKey: String!
    $url: String
    $id: String
    $user: String
    $password: String
  ) {
    updateForgeSettings(siteKey: $siteKey, url: $url, id: $id, user: $user, password: $password) {
      siteKey
      url
      id
      user
      passwordSet
    }
  }
`;
