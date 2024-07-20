import { utils } from 'ethers';
import { useRef, useState, useContext } from "react";
import { useEffect } from "react";
import { GlobalContext, GlobalContextProvider } from "../components/gamedev/GlobalContext";
import * as THREE from "three";
import { Canvas, useLoader } from "@react-three/fiber";
import { useControls } from "leva";
import {
  Sphere,
  useGLTF,
  GizmoHelper,
  GizmoViewport,
  OrbitControls,
  Outlines,
  Cylinder,
} from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { PivotControls } from "../components/gamedev/pivotControls";
import Swal from "sweetalert2";
import axios from "axios";
import Image from 'next/image';
import { ethers } from "ethers";
import GameFactory from "../contracts/GameFactory.json";
import ContractAddress from "../contracts/contract-address.json";

import objJSON from "../components/gamedev/objectMaster.json";
import UploadModel from "../components/UploadModel";
import EnvironmentControls from "../components/gamedev/EnvironmentControls";
import PlayerControls from "../components/gamedev/PlayerControls";
import ObjectControls from "../components/gamedev/ObjectControls";
import Model from "../components/gamedev/Model";
import LightControls from "../components/gamedev/LightControls";
import TaskControls from "../components/gamedev/TaskControls";
import LocationDisplay from "../components/gamedev/LocationDisplay";

import dchain from "../public/dchain.png";


import { GradientTexture, GradientType } from "@react-three/drei";
import { AsciiRenderer } from "@react-three/drei";
import { Grid } from "@react-three/drei";

export default function App() {
  useEffect(() => {

    const addDchainTestnet = async () => {
      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [networkMap.DCHAINTESTNET],
          });
        } catch (error) {
          console.error("Failed to setup the network:", error);
        }
      } else {
        console.log("Ethereum provider is not available");
      }
    };

    addDchainTestnet();
  }, []);
  return (
    <GlobalContextProvider>
      <Scene />
    </GlobalContextProvider>
  );
}

const networkMap = {
  DCHAINTESTNET: {
    chainId: utils.hexValue(2713017997578000),
    chainName: "Dchain Testnet",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://dchaintestnet-2713017997578000-1.jsonrpc.testnet.sagarpc.io"],
    blockExplorerUrls: ["https://dchaintestnet-2713017997578000-1.testnet.sagaexplorer.io/"],
  },
};

function Scene() {
  const [height, setHeight] = useState("30%");
  const [panelClass, setPanelClass] = useState("col-3");

  const ref = useRef();
  const fileInputRef = useRef(null);
  const { state, dispatch } = useContext(GlobalContext);
  const { objectMaster, currentObjectIdentifer, assetMaster } = state;

  // Load Object Master
  const LoadObjectMaster = (file) => {
    file.map((object) => {
      if (object.type === "object") {
        const AddAction = {
          type: "ADD_OBJECT",
          payload: {
            // Asset Information
            assetIdentifier: object.assetIdentifier,
            assetLink: object.assetLink,

            // Location and Orientation
            position: new THREE.Vector3(
              object.position.x,
              object.position.y,
              object.position.z
            ),
            quaternion: new THREE.Quaternion(
              object.quaternion.x,
              object.quaternion.y,
              object.quaternion.z,
              object.quaternion.w
            ),
            scale: new THREE.Vector3(
              object.scale.x,
              object.scale.y,
              object.scale.z
            ),
            worldMatrix: new THREE.Matrix4().fromArray(
              object.worldMatrix.elements
            ),
            initialVelocity: object.initialVelocity,
            followPlayer: object.followPlayer,
            scaleFactor: object.scaleFactor,
            scaleFactorPivot: object.scaleFactorPivot,

            // State
            fixed: object.fixed,
            mass: object.mass,
            colliders: object.colliders,

            // Methods
            OnClick: object.OnClick,
            OnHover: object.OnHover,
            OnCollision: object.OnCollision,
          },
        };

        dispatch(AddAction);
      } else if (object.type === "light") {
        const AddAction = {
          type: "ADD_LIGHT",
          payload: {
            assetIdentifier: object.assetIdentifier,
            position: new THREE.Vector3(
              object.position.x,
              object.position.y,
              object.position.z
            ),
            intensity: object.intensity,
            color: object.color,
          },
        };

        dispatch(AddAction);
      } else if (object.type === "task") {
        const AddAction = {
          type: "ADD_TASK",
          payload: {
            assetIdentifier: object.assetIdentifier,
          },
        };
        dispatch(AddAction);
      } else if (object.type === "environment") {
        const ChangeAction = {
          type: "CHANGE_ENVIRONMENT",
          payload: {
            assetIdentifier: object.assetIdentifier,
            gravity: object.gravity,
            sky_color: object.sky_color,
            ambient_light: object.ambient_light,
            player_speed: object.player_speed,
            player_mass: object.player_mass,
            player_size: object.player_size,
            player_jump: object.player_jump,
            player_flycontrol: object.player_flycontrol,
            stars: object.stars,
            env_music: object.env_music,
            player_music: object.player_music,
          },
        };
        dispatch(ChangeAction);
      }
    });
  };

  const DownloadObjectMaster = () => {
    const a = document.createElement("a");
    const file = new Blob([JSON.stringify(objectMaster)], {
      type: "application/json",
    });
    a.href = URL.createObjectURL(file);
    a.download = "objectMaster.json";
    a.click();
  };

  // Function to handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const fileContent = e.target.result;
      try {
        const worldData = JSON.parse(fileContent);
        LoadObjectMaster(worldData);
        console.log("World data loaded:", worldData);
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };

    reader.readAsText(file);
  };

  const [account, setAccount] = useState("");
  const [signer, setSigner] = useState(null);
  const [factoryContract, setFactoryContract] = useState(null);
  const [gameAddress, setGameAddress] = useState("");

  const web3Handler = async () => {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: networkMap.DCHAINTESTNET.chainId }],
      });

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      setSigner(signer);

      window.ethereum.on("accountsChanged", async function (accounts) {
        setAccount(accounts[0]);
        await web3Handler();
      });

      const factoryContract_ = new ethers.Contract(
        ContractAddress.GameFactory,
        GameFactory.abi,
        signer
      );
      setFactoryContract(factoryContract_);

      const { value: gameName } = await Swal.fire({
        title: "Enter Game Name",
        input: "text",
        inputLabel: "Game Name",
        inputPlaceholder: "Enter your game name",
        showCancelButton: true,
        inputValidator: (value) => {
          if (!value) {
            return "You need to enter a game name!";
          }
        },
      });

      if (gameName) {
        const { value: gamePrice } = await Swal.fire({
          title: "Enter Game Price",
          input: "number",
          inputLabel: "Game Price",
          inputPlaceholder: "Enter the price of your game",
          inputAttributes: {
            min: 0,
          },
          showCancelButton: true,
          inputValidator: (value) => {
            if (!value) {
              return "You need to enter a game price!";
            }
          },
        });

        if (gamePrice) {
          const { value: gameThumbnail } = await Swal.fire({
            title: "Enter Game Thumbnail",
            input: "text",
            inputLabel: "Game Thumbnail",
            inputPlaceholder: "Enter the thumbnail link of your game",
            showCancelButton: true,
            inputValidator: (value) => {
              if (!value) {
                return "You need to enter a game thumbnail!";
              }
            },
          });

          const getLink = async (e) => {
            try {
              const file = new Blob([JSON.stringify(objectMaster)], {
                type: "application/json",
              });
              const formData = new FormData();
              formData.append("file", file);

              const pinataMetadata = JSON.stringify({
                name: `final_json_${Date.now()}.json`,
              });
              formData.append("pinataMetadata", pinataMetadata);

              const pinataOptions = JSON.stringify({
                cidVersion: 0,
              });
              formData.append("pinataOptions", pinataOptions);

              const JWT = import.meta.env.VITE_PINATA_JWT;

              const res = await axios.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                formData,
                {
                  maxBodyLength: "Infinity",
                  headers: {
                    "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
                    Authorization: `Bearer ${JWT}`,
                  },
                }
              );

              if (res.data && res.data.IpfsHash) {
                // console.log(
                //   `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`
                // );
                return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
              } else {
                console.error("Failed to get IPFS link");
              }
            } catch (error) {
              console.error(
                "Error uploading json while publishing game:",
                error
              );
            }
          };

          const tasks = objectMaster.filter((object) => object.type === "task");

          let taskNames = [];

          tasks.map((task) => {
            taskNames.push(task.assetIdentifier);
          });

          console.log("taskNames:", taskNames);

          const tx = await factoryContract_.createGame(
            gameName,
            getLink(),
            gamePrice,
            gameThumbnail,
            taskNames
          );
          await tx.wait();

          const gameContractAddress = await factoryContract_.getGameAddresses();
          setGameAddress(gameContractAddress[gameContractAddress.length - 1]);

          Swal.fire({
            title: "Game Published!",
            text: `Game Address: ${gameContractAddress[gameContractAddress.length - 1]
              }`,
            icon: "success",
            confirmButtonText: "Open Game",
          }).then((result) => {
            if (result.isConfirmed) {
              let absoluteURL = new URL("https://dchaingame.vercel.app/");
              absoluteURL.searchParams.append(
                "game",
                gameContractAddress[gameContractAddress.length - 1]
              );
              window.open(absoluteURL.href, "_blank");
            }
          });
        }
      }
    } catch (error) {
      console.error("Error in web3Handler:", error);
    }
  };

  return (
    <div className="d-flex flex-column">
      <div className="row m-0 w-100 overflow-auto">
        <div
          className={
            "d-flex flex-column p-0 m-0 vh-100 " +
            (panelClass == "col-3" ? "col-9" : "col-12")
          }
        >
          <div
            className="d-flex flex-row standard-background"
            style={{ height: "5%" }}
          >
            <div className="col-3">
              <div className="d-flex align-items-center">
                <Image
                  src={dchain}
                  alt="dchain logo"
                  width="40"
                  className="me-1 align-middle"
                />
                <h3 className="text-light">
                  <span className="text-success">Chain</span>
                  {" "}Game DEV
                </h3>
              </div>
            </div>
          </div>

          <div className='flex flex-row'>
            <div className="col-6 text-end">
              <div className="m-0" style={{ padding: "1.5px" }}>
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
                <button
                  className="mx-1 px-2 p-1 my-0 standard-button"
                  onClick={() => fileInputRef.current.click()}
                >
                  <span className="me-1 bi bi-upload align-text-top"></span>
                  Upload
                </button>
                <button
                  className="mx-1 px-2 p-1 my-0 standard-button"
                  onClick={() => {
                    LoadObjectMaster(objJSON);
                  }}
                >
                  <span className="me-1 bi bi-folder-symlink align-text-top"></span>
                  Load
                </button>
                <button
                  className="mx-1 px-2 p-1 my-0 standard-button"
                  onClick={() => DownloadObjectMaster()}
                >
                  <span className="me-1 bi bi-cloud-arrow-down align-text-top"></span>
                  Export
                </button>
                <button
                  className="mx-1 px-2 p-1 my-0 standard-button"
                  onClick={() => {
                    console.log("redirect to debug enabled testing page");
                  }}
                >
                  <span className="me-1 bi bi-play-circle align-text-top"></span>
                  Test
                </button>
                <button
                  className="mx-1 px-2 p-1 my-0 standard-button"
                  onClick={() => {
                    web3Handler();
                  }}
                >
                  <span className="me-1 bi bi-cloud-arrow-up align-text-top"></span>
                  Publish
                </button>
                <button
                  className="ms-3 me-1 px-4 p-1 my-0 standard-fbutton"
                  onClick={() => {
                    if (panelClass === "col-3") setPanelClass("d-none");
                    else setPanelClass("col-3");
                  }}
                >
                  {panelClass == "col-3" ? (
                    <span className="bi bi-chevron-double-right"></span>
                  ) : (
                    <span className="bi bi-chevron-double-left"></span>
                  )}
                </button>
              </div>
            </div>
            <div
              className='px-[24px] flex-1'
              style={{ height: height === "300px" ? "400px" : "500px" }}>
              <Canvas
                shadows
                raycaster={{ params: { Line: { threshold: 0.15 } } }}
                camera={{ position: [-10, 10, 10], fov: 30 }}
                id="objectScene"
              >
                <color attach="background" args={[objectMaster[0].sky_color]} />
                <>
                  <Grid
                    args={[500, 500]}
                    cellSize={1}
                    sectionSize={5}
                    cellColor={"yellow"}
                    sectionThickness={1}
                    cellThickness={0.5}

                  />
                  <mesh position={[0, 1, 0]}>
                    <cylinderGeometry args={[0.5, 0.5, 1.5]} />
                    <Outlines thickness={0.05} color="hotpink" />
                    <meshNormalMaterial color={"green"} />
                  </mesh>

                  <ambientLight intensity={objectMaster[0].ambient_light} />
                  {objectMaster.map((object) => {
                    if (object.type === "object")
                      return (
                        <Model
                          assetIdentifer={object.assetIdentifier}
                          assetLink={object.assetLink}
                          collision={object.collision}
                          fixed={object.fixed}
                          worldMatrix={object.worldMatrix}
                          scaleFactor={object.scaleFactor}
                          scaleFactorPivot={object.scaleFactorPivot}
                        />
                      );
                    else return <></>;
                  })}
                </>

                {objectMaster.map((object) => {
                  if (object.type === "light")
                    return (
                      <>
                        <Sphere
                          scale={0.2}
                          position={[
                            object.position.x,
                            object.position.y,
                            object.position.z,
                          ]}
                        >
                          <meshStandardMaterial color={object.color} />
                        </Sphere>
                        <pointLight
                          key={object.assetIdentifier}
                          position={[
                            object.position.x,
                            object.position.y,
                            object.position.z,
                          ]}
                          intensity={object.intensity}
                          color={object.color}
                        />
                      </>
                    );
                  else return <></>;
                })}

                <mesh scale={30} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry />
                  <shadowMaterial transparent opacity={0.2} />
                </mesh>

                <GizmoHelper alignment="bottom-right" margin={[100, 100]}>
                  <GizmoViewport labelColor="white" axisHeadScale={1} />
                </GizmoHelper>
                <OrbitControls makeDefault />
              </Canvas>
            </div>
          </div>

          <div
            className="standard-background overflow-auto w-100"
            style={{ height: height }}
          >
            <div className="row m-0 pb-1">
              <button
                className="m-0 p-0 border-0 text-light"
                style={{ borderRadius: "0px" }}
                onClick={() => {
                  if (height === "30%") setHeight("3.4%");
                  else setHeight("30%");
                }}
              >
                {height === "30%" ? (
                  <span className="bi bi-chevron-double-down"></span>
                ) : (
                  <span className="bi bi-chevron-double-up"></span>
                )}
              </button>
            </div>
            <div className="row m-0 p-0">
              {assetMaster.map((object, index) => {
                let objectName = object.metadata.name;
                let objectNameWithoutTimeStamp = objectName.split("_")[0];
                if (objectNameWithoutTimeStamp.split(".").pop() !== "glb") return;
                let url = `https://gateway.pinata.cloud/ipfs/${object.ipfs_pin_hash}`;
                if (true)
                  return (
                    <div
                      key={index}
                      className="col-2 m-0 p-0 card text-light border-0 bg-transparent"
                    >
                      <div className="d-flex flex-column card-body bg-dark m-1 rounded-2 shadow-">
                        <h6 className="card-title">{objectNameWithoutTimeStamp}</h6>
                        <div className="flex-fill"></div>
                        <div className="d-flex justify-content-between">
                          <a href={url} className="btn btn-primary">
                            <span className="bi bi-download"></span>
                          </a>
                          <button
                            className="btn btn-primary"
                            onClick={(e) => {
                              navigator.clipboard.writeText(url);
                              dispatch({
                                type: "ADD_OBJECT",
                                payload: {
                                  link: url,
                                  assetIdentifier: objectName,
                                  assetLink: url,
                                  position: new THREE.Vector3(0, 0, 0),
                                  quaternion: new THREE.Quaternion(0, 0, 0, 0),
                                  scale: new THREE.Vector3(1, 1, 1),
                                  worldMatrix: new THREE.Matrix4(),
                                  colliders: "no", // no, yes, box, hull, trimesh (yes=box)
                                  fixed: false, // true, false
                                  OnClick: "",
                                  OnHover: "",
                                  OnCollision: "",
                                },
                              });
                            }}
                          >
                            <span className="bi bi-plus"></span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>
        </div>

        {/* Panel */}
        <div
          className={
            "text-light shadow standard-background vh-100 p-0 overflow-auto " +
            panelClass
          }
        >
          <div className="accordion accordion-flush" id="accordionFlushExample">
            <div className="p-1 shadow-sm pb-2 rounded-2">
              <h4 className="text-start standard-fbutton rounded-2 px-2 p-1 px-2 py-2">
                Wallet Controls
              </h4>
              <UploadModel />
            </div>
            <div className="m-1 shadow-sm pb-2 rounded-2 mt-3">
              <h4 className="text-start standard-fbutton rounded-2 px-2 py-2">
                Game Controls
              </h4>
              <EnvironmentControls />
              <PlayerControls />
              <ObjectControls />
              <LocationDisplay />
              <LightControls />
              <TaskControls />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
