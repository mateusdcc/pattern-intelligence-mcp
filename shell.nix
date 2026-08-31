{
  pkgs ? import <nixpkgs> { },
  nixpi ? builtins.getFlake "github:mateusdcc/nixpi",
  pi-packages ? builtins.getFlake "github:mateusdcc/pi-packages",
}:

let
  customPi = nixpi.lib.makePi {
    inherit pkgs;
    modules = [
      pi-packages.piModules.default
      {
        programs.pi = {
          settings = {
            mcpServers = {
              playwright = {
                command = "npx";
                args = [
                  "-y"
                  "@playwright/mcp@latest"
                ];
              };
            };
          };
          extensions = {
            subagents.enable = true;
            ripgrep-search.enable = true;
          };
          skills = {
            commit-style.enable = true;
          };
        };
      }
    ];
  };
in
pkgs.mkShell {
  name = "pattern-intelligence-mcp-shell";

  nativeBuildInputs = with pkgs; [
    nodejs_22
    git
    ripgrep
    jq
    which
  ];

  buildInputs = with pkgs; [
    customPi
  ] ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isDarwin [
    apple-sdk
  ];

  shellHook = ''
    export PATH="$PWD/node_modules/.bin:$PATH"
  '';
}
